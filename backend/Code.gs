/*************************************************************************************************
 * NEXUS Trade & Enterprise — Code.gs   (Milestone 1: Foundation)
 * Powered by CYRABELL
 *
 * Entry/routing, Google ID-token auth, the 9-step mutation pipeline, generic CRUD,
 * setup() bootstrap, installTriggers(). Proves the pipeline end-to-end on Products.
 *
 * Request envelope (from the Cloudflare Worker, see worker.js / Section 0.4):
 *   doPost body = { path, method, token, query, body }
 * Response envelope (Section 0.2):
 *   { success, data, error, meta }
 *************************************************************************************************/

/* ============================================================================================
 *  ENTRY & ROUTING
 * ========================================================================================== */

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data, meta) {
  return jsonOut_({ success: true, data: data === undefined ? null : data, error: null, meta: meta || null });
}

function fail_(code, message) {
  return jsonOut_({ success: false, data: null, error: { code: code, message: message }, meta: null });
}

/** Parse the Worker envelope from either POST body or GET query params. */
function parseEnvelope_(e) {
  var env = { path: '', method: 'GET', token: '', query: {}, body: {} };
  if (e && e.postData && e.postData.contents) {
    try {
      var parsed = JSON.parse(e.postData.contents);
      env.path = parsed.path || '';
      env.method = (parsed.method || 'GET').toUpperCase();
      env.token = parsed.token || '';
      env.query = parsed.query || {};
      env.body = parsed.body || {};
    } catch (err) { /* fall through to query params */ }
  }
  if (!env.path && e && e.parameter) {
    env.path = e.parameter.path || '';
    env.method = (e.parameter.method || 'GET').toUpperCase();
    env.token = e.parameter.token || '';
  }
  return env;
}

/** Central router. */
function handleRequest(e) {
  var env = parseEnvelope_(e);
  try {
    var path = env.path.replace(/^\/+|\/+$/g, ''); // trim slashes
    var parts = path.split('/');                   // e.g. ["api","products","<id>"]

    // ---- Public (no auth) ----
    if (path === 'api/config' && env.method === 'GET') return getPublicConfig_();
    if (path === 'api/auth/login' && env.method === 'POST') return authLogin_(env.body);

    // ---- Everything else requires a valid session ----
    var userId = authenticate(env.token);

    if (path === 'api/auth/logout' && env.method === 'POST') return authLogout_(env.token);
    if (path === 'api/me' && env.method === 'GET') return getMe_(userId);

    // Form schema for config-driven rendering: GET /api/meta/form-fields?module=Products
    if (path === 'api/meta/form-fields' && env.method === 'GET') {
      var roleId = PermissionService.primaryRole(userId);
      return ok_(ConfigService.getFormFields(env.query.module, roleId));
    }

    // ---- Generic CRUD: api/{module}[/{id}] ----
    if (parts[0] === 'api' && parts.length >= 2) {
      var module = ROUTE_TO_SHEET_[parts[1]];
      if (module) {
        var id = parts[2];
        return crud_(env, userId, parts[1], module, id);
      }
    }

    return fail_('NOT_FOUND', 'No route for ' + env.method + ' /' + path);
  } catch (err) {
    var code = err.apiCode || 'INTERNAL';
    return fail_(code, err.message || 'Unexpected error');
  }
}

/* ============================================================================================
 *  ROUTE TABLE
 *  Maps url segment -> sheet name + the module key used for license/permission/audit.
 *  M1 ships the foundation routes + Products as the end-to-end proof. M2+ extend this map.
 * ========================================================================================== */

var ROUTE_TO_SHEET_ = {
  'products': 'Products',
  'users': 'Users',
  'alarms': 'Alarms',
  'alarm-rules': 'AlarmRules',
  'event-log': 'EventLog'
};

/** Singular key for license/permission/audit per url segment. */
function moduleKey_(segment) {
  var map = {
    'products': 'Products', 'users': 'Users',
    'alarms': 'EventLogAlarms', 'alarm-rules': 'EventLogAlarms', 'event-log': 'EventLogAlarms'
  };
  return map[segment] || segment;
}

/** Primary key field per sheet (extend as modules are added). */
function keyField_(sheetName) {
  var map = {
    Products: 'productId', Users: 'userId', Alarms: 'alarmId',
    AlarmRules: 'alarmRuleId', EventLog: 'eventId'
  };
  return map[sheetName] || 'id';
}

/* ============================================================================================
 *  AUTH
 * ========================================================================================== */

/**
 * POST /api/auth/login  { idToken }
 * Verify Google ID token, match an active Users row, issue an opaque session token.
 */
function authLogin_(body) {
  var idToken = body && body.idToken;
  if (!idToken) return fail_('VALIDATION_FAILED', 'idToken required');

  var resp = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) return fail_('UNAUTHENTICATED', 'Invalid Google token');
  var info = JSON.parse(resp.getContentText());

  var expectedAud = ConfigService.getConfig('GoogleOAuthClientId', '');
  if (expectedAud && info.aud !== expectedAud) {
    return fail_('UNAUTHENTICATED', 'Token audience mismatch');
  }
  var email = (info.email || '').toLowerCase();
  var user = getSheetData('Users').filter(function (u) {
    return String(u.email).toLowerCase() === email;
  })[0];
  if (!user) return fail_('UNAUTHENTICATED', 'No account for ' + email);
  if (String(user.status).toLowerCase() !== 'active') return fail_('FORBIDDEN', 'Account inactive');

  var token = generateId();
  var days = Number(ConfigService.getConfig('session_expiry_days', 7));
  var expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  withLock(function () {
    appendRowToSheet('Sessions', {
      sessionId: generateId(), userId: user.userId, token: token,
      scope: 'staff', createdAt: nowISO(), expiresAt: expiresAt
    });
  });
  EventLogService.logEvent(user.userId, 'Auth', 'LOGIN', user.userId, 'Login ' + email, null);
  return ok_({ token: token, user: { userId: user.userId, name: user.name, email: user.email } });
}

function authLogout_(token) {
  withLock(function () { deleteRowByKey('Sessions', 'token', token); });
  return ok_({ loggedOut: true });
}

/** Resolve a Bearer session token to a userId, or throw UNAUTHENTICATED. */
function authenticate(token) {
  if (!token) throw apiError_('UNAUTHENTICATED', 'Missing token');
  var session = findRowByKey('Sessions', 'token', token);
  if (!session) throw apiError_('UNAUTHENTICATED', 'Invalid session');
  if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
    throw apiError_('UNAUTHENTICATED', 'Session expired');
  }
  return session.userId;
}

/** Enforce RBAC if use_rbac is on. */
function authorize(userId, module, action) {
  if (!ConfigService.isFeatureEnabled('use_rbac')) return;
  if (!PermissionService.userCan(userId, module, action)) {
    throw apiError_('FORBIDDEN', 'Not permitted: ' + action + ' on ' + module);
  }
}

function getMe_(userId) {
  var user = findRowByKey('Users', 'userId', userId);
  var perms = PermissionService.getUserPermissions(userId);
  return ok_({
    user: user ? { userId: user.userId, name: user.name, email: user.email } : null,
    roleIds: perms.roleIds,
    modules: PermissionService.getAllowedModules(userId)
  });
}

/* ============================================================================================
 *  GENERIC CRUD  (the 9-step pipeline lives here)
 * ========================================================================================== */

function crud_(env, userId, segment, sheetName, id) {
  var module = moduleKey_(segment);
  var kf = keyField_(sheetName);

  // ---------- READ (list) ----------
  if (env.method === 'GET' && !id) {
    authorize(userId, module, 'read');
    LicenseService.validateLicense(module);
    var rows = getSheetData(sheetName);
    // simple filters from query (?field=value)
    Object.keys(env.query || {}).forEach(function (k) {
      if (['page', 'pageSize'].indexOf(k) !== -1) return;
      rows = rows.filter(function (r) { return String(r[k]) === String(env.query[k]); });
    });
    var page = Number(env.query.page || 1);
    var pageSize = Number(env.query.pageSize || 50);
    var total = rows.length;
    var start = (page - 1) * pageSize;
    var pageRows = rows.slice(start, start + pageSize);
    return ok_(pageRows, { page: page, pageSize: pageSize, total: total, hasMore: start + pageSize < total });
  }

  // ---------- READ (single) ----------
  if (env.method === 'GET' && id) {
    authorize(userId, module, 'read');
    LicenseService.validateLicense(module);
    var rec = findRowByKey(sheetName, kf, id);
    if (!rec) return fail_('NOT_FOUND', sheetName + ' ' + id + ' not found');
    return ok_(rec);
  }

  // ---------- CREATE ----------
  if (env.method === 'POST' && !id) {
    return mutate_(env, userId, module, sheetName, 'create', function () {
      var record = env.body || {};
      var v = ValidationService.validateInput(module, record);
      if (!v.valid) throw validationError_(v.errors);
      if (!record[kf]) record[kf] = generateId();
      if (sheetName === 'Products' && !record.createdAt) record.createdAt = nowISO();
      appendRowToSheet(sheetName, record);
      return { recordId: record[kf], record: record };
    });
  }

  // ---------- UPDATE ----------
  if (env.method === 'PUT' && id) {
    return mutate_(env, userId, module, sheetName, 'update', function () {
      var existing = findRowByKey(sheetName, kf, id);
      if (!existing) throw apiError_('NOT_FOUND', sheetName + ' ' + id + ' not found');
      var updates = env.body || {};
      // Status changes go through the transition guard.
      if (updates.status && existing.status && updates.status !== existing.status) {
        TransitionService.assertTransition(module, existing.status, updates.status,
          PermissionService.primaryRole(userId));
      }
      var merged = updateRowByKey(sheetName, kf, id, updates);
      return { recordId: id, record: merged, oldValue: existing };
    });
  }

  // ---------- DELETE ----------
  if (env.method === 'DELETE' && id) {
    return mutate_(env, userId, module, sheetName, 'delete', function () {
      var existing = findRowByKey(sheetName, kf, id);
      if (!existing) throw apiError_('NOT_FOUND', sheetName + ' ' + id + ' not found');
      deleteRowByKey(sheetName, kf, id);
      return { recordId: id, oldValue: existing };
    });
  }

  return fail_('NOT_FOUND', 'Unsupported ' + env.method + ' on ' + segment);
}

function validationError_(errors) {
  var e = apiError_('VALIDATION_FAILED', 'Validation failed');
  e.fieldErrors = errors;
  return e;
}

/**
 * The 9-step mutation pipeline (Section 0.11):
 *   authenticate (done by caller) -> authorize -> license -> [validate inside op]
 *   -> lock+execute -> audit -> event log -> workflow -> respond.
 */
function mutate_(env, userId, module, sheetName, action, op) {
  authorize(userId, module, action);
  LicenseService.validateLicense(module);

  // Idempotency (optional key forwarded by the Worker in query).
  var idemKey = env.query && env.query.idempotencyKey;

  try {
    var result = withLock(function () {
      var prior = IdempotencyService.checkAndStore(idemKey, sheetName + ':' + action, '');
      if (prior) return { idempotentReplay: true, recordId: prior };
      return op();
    });

    var eventType = action === 'create' ? 'CREATED'
                  : action === 'update' ? 'UPDATED'
                  : action === 'delete' ? 'DELETED' : 'UPDATED';

    AuditService.logAction(userId, action, sheetName, result.recordId,
      result.oldValue || null, result.record || null);
    EventLogService.logEvent(userId, sheetName, eventType, result.recordId,
      action + ' ' + sheetName, result.record || result.oldValue || null);
    // WorkflowService.triggerWorkflow(...) lands in M6.

    return ok_({ recordId: result.recordId, record: result.record || null });
  } catch (err) {
    if (err.apiCode === 'VALIDATION_FAILED' && err.fieldErrors) {
      return jsonOut_({ success: false, data: null,
        error: { code: 'VALIDATION_FAILED', message: 'Validation failed', fields: err.fieldErrors },
        meta: null });
    }
    return fail_(err.apiCode || 'INTERNAL', err.message);
  }
}

/* ============================================================================================
 *  PUBLIC CONFIG  (secrets allowlist, Section 0.10)
 * ========================================================================================== */

function getPublicConfig_() {
  var allow = ['AppName', 'PrimaryColor', 'CustomerPortalEnabled', 'DefaultCurrency',
               'feature_registration_open', 'use_rbac'];
  var cfg = ConfigService.loadConfig();
  var out = {};
  allow.forEach(function (k) { if (cfg[k] !== undefined) out[k] = cfg[k]; });
  return ok_(out);
}

/* ============================================================================================
 *  BOOTSTRAP  —  run setup() once from the editor
 * ========================================================================================== */

var SCHEMA_M1_ = {
  Users: ['userId','email','name','primaryRole','companyName','phone','registeredAt','status'],
  Roles: ['roleId','roleName','description','isSystem'],
  RolePermissions: ['permissionId','roleId','module','action'],
  UserRoles: ['userRoleId','userId','roleId','entityId'],
  Sessions: ['sessionId','userId','token','scope','createdAt','expiresAt'],
  Alerts: ['alertId','userId','module','type','title','message','isRead','severity','channel','createdAt'],
  AuditTrail: ['auditId','userId','action','module','recordId','oldValue','newValue','timestamp'],
  IdempotencyKeys: ['keyId','idempotencyKey','endpoint','resultRef','createdAt'],
  EventLog: ['eventId','timestamp','userId','module','eventType','recordId','summary','details'],
  AlarmRules: ['alarmRuleId','name','description','eventType','condition','severity','isActive','notifyUsers'],
  Alarms: ['alarmId','alarmRuleId','eventId','triggeredAt','acknowledgedAt','acknowledgedBy','resolvedAt','status','notes'],
  Products: ['productId','sellerId','name','description','category','imageUrls','specifications','minOrderQty','unit','priceRange','isActive','entityId','createdAt'],
  Entities: ['entityId','name','legalName','taxId','currency','country','isActive'],
  FormFields: ['fieldId','module','fieldKey','label','type','required','options','validation','order','visibleRoles','readonly'],
  StatusTransitions: ['transitionId','module','fromStatus','toStatus','allowedRoles','requiresApproval','guardCondition'],
  Config: ['configKey','configValue','description'],
  Licenses: ['licenseId','module','enabled','expirationDate','maxUsers','features'],
  LeaveTypes: ['leaveTypeId','name','defaultDays','isPaid','carryForward']
};

var CONFIG_DEFAULTS_ = [
  ['AppName','NEXUS Trade & Enterprise','Product name'],
  ['PrimaryColor','#1E3A5F','Primary brand colour'],
  ['AdminEmail','admin@example.com','First SuperAdmin email — CHANGE THIS'],
  ['NotificationEmail','noreply@example.com','From address for notifications'],
  ['TwilioSID','','SMS provider SID (secret)'],
  ['TwilioAuthToken','','SMS auth token (secret)'],
  ['TwilioFromNumber','','SMS sender (secret)'],
  ['GoogleCloudAPIKey','','Cloud API key (secret)'],
  ['CustomerPortalEnabled','true','Enable customer portal'],
  ['DefaultTaxRate','12','Default tax %'],
  ['DefaultCurrency','PHP','ISO currency'],
  ['DefaultOrderExpiryDays','30','Order expiry'],
  ['AutomationEngineEnabled','true','Automation engine toggle'],
  ['EventLogEnabled','true','Event log toggle'],
  ['enable_integration_hub','false','Integration hub toggle'],
  ['use_rbac','true','Enforce RBAC'],
  ['session_expiry_days','7','Session lifetime'],
  ['low_stock_threshold_percent','20','Low stock %'],
  ['auto_create_order_on_quote_accept','true','Auto-create order'],
  ['inventory_auto_reserve_on_order','true','Reserve on order'],
  ['inventory_auto_deduct_on_ship','true','Deduct on ship'],
  ['feature_registration_open','false','Open registration'],
  ['default_user_role','Viewer','Default role'],
  ['GoogleOAuthClientId','','OAuth client ID — CHANGE THIS'],
  ['AllowedOrigin','https://example.github.io','Worker CORS origin — CHANGE THIS'],
  ['AppsScriptUrl','','This web app /exec URL — CHANGE THIS']
];

var ROLES_DEFAULTS_ = [
  ['SuperAdmin','Full system administrator','true'],
  ['Admin','Entity administrator','true'],
  ['Finance','Finance and accounting','true'],
  ['Procurement','Trading and procurement','true'],
  ['Warehouse','Warehousing and logistics','true'],
  ['HR','Human resources and payroll','true'],
  ['Sales','Sales and CRM','true'],
  ['Viewer','Read-only','true'],
  ['PortalCustomer','Customer portal only','true']
];

function setup() {
  var ss = SS_();

  // 1) Sheets + headers
  Object.keys(SCHEMA_M1_).forEach(function (name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = SCHEMA_M1_[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  });

  // 2) Config
  if (getSheetData('Config').length === 0) {
    CONFIG_DEFAULTS_.forEach(function (r) {
      appendRowToSheet('Config', { configKey: r[0], configValue: r[1], description: r[2] });
    });
  }
  ConfigService.invalidate();

  // 3) Roles + role ids
  var roleIdByName = {};
  if (getSheetData('Roles').length === 0) {
    ROLES_DEFAULTS_.forEach(function (r) {
      var id = generateId();
      roleIdByName[r[0]] = id;
      appendRowToSheet('Roles', { roleId: id, roleName: r[0], description: r[1], isSystem: r[2] });
    });
  } else {
    getSheetData('Roles').forEach(function (r) { roleIdByName[r.roleName] = r.roleId; });
  }

  // 4) RolePermissions (seed matrix — M1 essentials)
  if (getSheetData('RolePermissions').length === 0) {
    var grant = function (roleName, module, action) {
      appendRowToSheet('RolePermissions', {
        permissionId: generateId(), roleId: roleIdByName[roleName], module: module, action: action
      });
    };
    grant('SuperAdmin', '*', 'admin');
    grant('Admin', '*', 'manage');
    ['create','read','update','delete','export'].forEach(function (a) {
      grant('Procurement', 'Products', a);
    });
    grant('Viewer', 'Products', 'read');
    grant('Viewer', 'EventLogAlarms', 'read');
    grant('Procurement', 'EventLogAlarms', 'read');
  }

  // 5) Licenses (all M1 modules enabled, far-future expiry)
  if (getSheetData('Licenses').length === 0) {
    ['Products','Users','EventLogAlarms'].forEach(function (m) {
      appendRowToSheet('Licenses', {
        licenseId: generateId(), module: m, enabled: 'true',
        expirationDate: '2099-12-31', maxUsers: 9999, features: '{}'
      });
    });
  }

  // 6) FormFields for Products (the proof module)
  if (ConfigService.getFormFields('Products').length === 0) {
    var pf = [
      ['name','Product Name','text','true','', '{"maxLen":120}','1','',''],
      ['category','Category','text','false','', '','2','',''],
      ['description','Description','textarea','false','', '','3','',''],
      ['unit','Unit','text','true','', '','4','',''],
      ['minOrderQty','Min Order Qty','number','true','', '{"min":1}','5','',''],
      ['priceRange','Price Range','text','false','', '','6','',''],
      ['isActive','Active','select','true','["true","false"]','','7','','']
    ];
    pf.forEach(function (f) {
      appendRowToSheet('FormFields', {
        fieldId: generateId(), module: 'Products', fieldKey: f[0], label: f[1], type: f[2],
        required: f[3], options: f[4], validation: f[5], order: f[6], visibleRoles: f[7], readonly: f[8]
      });
    });
  }

  // 7) StatusTransitions (Products has none beyond active flag; seed Alarms as reference)
  if (getSheetData('StatusTransitions').length === 0) {
    var trans = [
      ['Alarms','Active','Acknowledged','SuperAdmin,Admin','false',''],
      ['Alarms','Acknowledged','Resolved','SuperAdmin,Admin','false','']
    ];
    trans.forEach(function (t) {
      appendRowToSheet('StatusTransitions', {
        transitionId: generateId(), module: t[0], fromStatus: t[1], toStatus: t[2],
        allowedRoles: t[3], requiresApproval: t[4], guardCondition: t[5]
      });
    });
  }

  // 8) First SuperAdmin from AdminEmail
  var adminEmail = ConfigService.getConfig('AdminEmail', '');
  if (adminEmail && getSheetData('Users').filter(function (u) {
        return String(u.email).toLowerCase() === adminEmail.toLowerCase(); }).length === 0) {
    var adminId = generateId();
    appendRowToSheet('Users', {
      userId: adminId, email: adminEmail, name: 'System Administrator',
      primaryRole: 'SuperAdmin', companyName: '', phone: '',
      registeredAt: nowISO(), status: 'active'
    });
    appendRowToSheet('UserRoles', {
      userRoleId: generateId(), userId: adminId, roleId: roleIdByName['SuperAdmin'], entityId: ''
    });
  }

  return 'Setup complete. Update AdminEmail, GoogleOAuthClientId, AllowedOrigin, AppsScriptUrl in Config.';
}

/* ============================================================================================
 *  TRIGGERS  (agents implemented in M6; installer ready now)
 * ========================================================================================== */

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('runMonitoringAgent').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('runAutomationEngine').timeBased().everyMinutes(5).create();
  return 'Triggers installed.';
}

// Placeholders so installTriggers() does not fail before M6 fills these in.
function runMonitoringAgent() { /* M6 */ }
function runAutomationEngine() { /* M6 */ }
