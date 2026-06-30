/*************************************************************************************************
 * NEXUS Trade & Enterprise — Helpers.gs   (Milestone 1: Foundation)
 * Powered by CYRABELL
 *
 * Core services: generic sheet ops, locking, idempotency, Config, License, Permission,
 * Validation, Transition, Audit, EventLog, Alarm.
 *
 * Conventions (Section 0 of the build prompt) are binding:
 *  - Every mutation acquires a script lock (withLock).
 *  - Config + License lookups are cached (CacheService, 300s).
 *  - All timestamps ISO 8601, all IDs UUID.
 *************************************************************************************************/

/** Open the bound spreadsheet once. */
function SS_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/* ============================================================================================
 *  LOCKING
 * ========================================================================================== */

/**
 * Run fn() while holding the script lock. Every write path must use this.
 * @param {function} fn
 * @return {*} fn's return value
 */
function withLock(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw apiError_('CONFLICT', 'System busy, please retry.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ============================================================================================
 *  GENERIC SHEET OPERATIONS
 * ========================================================================================== */

/** Header row cache to avoid re-reading headers on every call within an execution. */
var _HEADER_CACHE = {};

function getHeaders_(sheetName) {
  if (_HEADER_CACHE[sheetName]) return _HEADER_CACHE[sheetName];
  var sheet = SS_().getSheetByName(sheetName);
  if (!sheet) throw apiError_('INTERNAL', 'Sheet not found: ' + sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  _HEADER_CACHE[sheetName] = headers;
  return headers;
}

/**
 * Return all rows of a sheet as an array of objects keyed by header.
 * @param {string} sheetName
 * @return {Object[]}
 */
function getSheetData(sheetName) {
  var sheet = SS_().getSheetByName(sheetName);
  if (!sheet) throw apiError_('INTERNAL', 'Sheet not found: ' + sheetName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  var headers = getHeaders_(sheetName);
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return values.map(function (row) {
    var obj = {};
    for (var i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
    return obj;
  });
}

/**
 * Append an object as a new row, mapped to the sheet's header order.
 * Missing keys become ''. Unknown keys are ignored.
 */
function appendRowToSheet(sheetName, rowObj) {
  var sheet = SS_().getSheetByName(sheetName);
  if (!sheet) throw apiError_('INTERNAL', 'Sheet not found: ' + sheetName);
  var headers = getHeaders_(sheetName);
  var row = headers.map(function (h) {
    return rowObj[h] === undefined || rowObj[h] === null ? '' : rowObj[h];
  });
  sheet.appendRow(row);
  return rowObj;
}

/** Return the first row (object) whose keyField equals keyValue, or null. */
function findRowByKey(sheetName, keyField, keyValue) {
  var data = getSheetData(sheetName);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][keyField]) === String(keyValue)) return data[i];
  }
  return null;
}

/** Internal: find the 1-based sheet row index for a key match, or -1. */
function findRowIndex_(sheetName, keyField, keyValue) {
  var sheet = SS_().getSheetByName(sheetName);
  var headers = getHeaders_(sheetName);
  var col = headers.indexOf(keyField);
  if (col === -1) throw apiError_('INTERNAL', 'Unknown field ' + keyField + ' on ' + sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var colValues = sheet.getRange(2, col + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < colValues.length; i++) {
    if (String(colValues[i][0]) === String(keyValue)) return i + 2; // +2: 1-based + header row
  }
  return -1;
}

/**
 * Update the first row matching keyField=keyValue with the given updates object.
 * Returns the merged object, or null if no match.
 */
function updateRowByKey(sheetName, keyField, keyValue, updates) {
  var sheet = SS_().getSheetByName(sheetName);
  var headers = getHeaders_(sheetName);
  var rowIndex = findRowIndex_(sheetName, keyField, keyValue);
  if (rowIndex === -1) return null;
  var existing = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  var merged = {};
  for (var i = 0; i < headers.length; i++) {
    merged[headers[i]] = (updates[headers[i]] !== undefined) ? updates[headers[i]] : existing[i];
  }
  var row = headers.map(function (h) {
    return merged[h] === undefined || merged[h] === null ? '' : merged[h];
  });
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
  return merged;
}

/** Delete the first row matching keyField=keyValue. Returns true if deleted. */
function deleteRowByKey(sheetName, keyField, keyValue) {
  var sheet = SS_().getSheetByName(sheetName);
  var rowIndex = findRowIndex_(sheetName, keyField, keyValue);
  if (rowIndex === -1) return false;
  sheet.deleteRow(rowIndex);
  return true;
}

/** UUID. */
function generateId() {
  return Utilities.getUuid();
}

/** Current ISO 8601 timestamp. */
function nowISO() {
  return new Date().toISOString();
}

/** Build a standard API error object (carried in the response body, never HTTP status). */
function apiError_(code, message) {
  var e = new Error(message);
  e.apiCode = code;
  return e;
}

/* ============================================================================================
 *  CONFIG SERVICE
 * ========================================================================================== */

var ConfigService = {
  CACHE_KEY: 'nexus_config_v1',
  TTL: 300,

  /** Read Config sheet into an object, cached 300s. */
  loadConfig: function () {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(this.CACHE_KEY);
    if (cached) return JSON.parse(cached);
    var rows = getSheetData('Config');
    var cfg = {};
    rows.forEach(function (r) { cfg[r.configKey] = r.configValue; });
    cache.put(this.CACHE_KEY, JSON.stringify(cfg), this.TTL);
    return cfg;
  },

  invalidate: function () {
    CacheService.getScriptCache().remove(this.CACHE_KEY);
  },

  getConfig: function (key, defaultValue) {
    var v = this.loadConfig()[key];
    return (v === undefined || v === '') ? defaultValue : v;
  },

  /** Truthy interpretation of toggle keys ("true"/"TRUE"/true/1). */
  isFeatureEnabled: function (key) {
    var v = String(this.getConfig(key, 'false')).toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
  },

  /** FormFields for a module, ordered, optionally role-filtered. */
  getFormFields: function (module, roleId) {
    var fields = getSheetData('FormFields')
      .filter(function (f) { return f.module === module; })
      .sort(function (a, b) { return Number(a.order) - Number(b.order); });
    if (roleId) {
      fields = fields.filter(function (f) {
        var vis = String(f.visibleRoles || '').trim();
        if (!vis) return true;
        return vis.split(',').map(function (s) { return s.trim(); }).indexOf(roleId) !== -1;
      });
    }
    return fields;
  },

  /** Allowed status transitions for a module (and optional role). */
  getAllowedStatusTransitions: function (module, roleId) {
    return getSheetData('StatusTransitions').filter(function (t) {
      if (t.module !== module) return false;
      if (!roleId) return true;
      var roles = String(t.allowedRoles || '').trim();
      if (!roles) return true;
      return roles.split(',').map(function (s) { return s.trim(); }).indexOf(roleId) !== -1;
    });
  }
};

/* ============================================================================================
 *  LICENSE SERVICE
 * ========================================================================================== */

var LicenseService = {
  _all: function () { return getSheetData('Licenses'); },

  isModuleLicensed: function (module) {
    var lic = this._all().filter(function (l) { return l.module === module; })[0];
    if (!lic) return false;
    var enabled = String(lic.enabled).toLowerCase() === 'true';
    if (!enabled) return false;
    if (lic.expirationDate) {
      if (new Date(lic.expirationDate).getTime() < Date.now()) return false;
    }
    return true;
  },

  getLicenseExpiry: function (module) {
    var lic = this._all().filter(function (l) { return l.module === module; })[0];
    return lic && lic.expirationDate ? lic.expirationDate : null;
  },

  /** Throw NOT_LICENSED / LICENSE_EXPIRED as appropriate. */
  validateLicense: function (module) {
    var lic = this._all().filter(function (l) { return l.module === module; })[0];
    if (!lic || String(lic.enabled).toLowerCase() !== 'true') {
      throw apiError_('NOT_LICENSED', 'Module not licensed: ' + module);
    }
    if (lic.expirationDate && new Date(lic.expirationDate).getTime() < Date.now()) {
      throw apiError_('LICENSE_EXPIRED', 'License expired for module: ' + module);
    }
  }
};

/* ============================================================================================
 *  PERMISSION SERVICE  (entity-aware)
 * ========================================================================================== */

var PermissionService = {
  /** Join UserRoles -> RolePermissions for a user. Returns {permissions:[], roleIds:[], entityIds:[]}. */
  getUserPermissions: function (userId) {
    var userRoles = getSheetData('UserRoles').filter(function (ur) { return ur.userId === userId; });
    var roleIds = userRoles.map(function (ur) { return ur.roleId; });
    var entityIds = userRoles.map(function (ur) { return ur.entityId || ''; });
    var perms = getSheetData('RolePermissions').filter(function (p) {
      return roleIds.indexOf(p.roleId) !== -1;
    });
    return { permissions: perms, roleIds: roleIds, entityIds: entityIds };
  },

  /** Does user have module+action? SuperAdmin (admin on '*') passes everything. */
  userCan: function (userId, module, action) {
    var p = this.getUserPermissions(userId).permissions;
    for (var i = 0; i < p.length; i++) {
      if ((p[i].module === '*' || p[i].module === module) &&
          (p[i].action === 'admin' || p[i].action === action ||
           (p[i].action === 'manage' && action !== 'admin'))) {
        return true;
      }
    }
    return false;
  },

  getAllowedModules: function (userId) {
    var p = this.getUserPermissions(userId).permissions;
    var set = {};
    p.forEach(function (x) { set[x.module] = true; });
    return Object.keys(set);
  },

  /** Primary roleId of a user (first role), for transition/role checks. */
  primaryRole: function (userId) {
    var ur = getSheetData('UserRoles').filter(function (x) { return x.userId === userId; })[0];
    return ur ? ur.roleId : null;
  }
};

/* ============================================================================================
 *  VALIDATION SERVICE  (against FormFields)
 * ========================================================================================== */

var ValidationService = {
  /**
   * Validate a record payload for a module against FormFields.
   * Returns { valid: bool, errors: {field: msg} }.
   */
  validateInput: function (module, record) {
    var fields = ConfigService.getFormFields(module);
    var errors = {};
    fields.forEach(function (f) {
      var key = f.fieldKey;
      var val = record[key];
      var required = String(f.required).toLowerCase() === 'true';
      var present = val !== undefined && val !== null && String(val) !== '';

      if (required && !present) { errors[key] = f.label + ' is required.'; return; }
      if (!present) return;

      var rules = {};
      if (f.validation) { try { rules = JSON.parse(f.validation); } catch (e) { rules = {}; } }

      if (f.type === 'number' || f.type === 'currency') {
        var n = Number(val);
        if (isNaN(n)) { errors[key] = f.label + ' must be a number.'; return; }
        if (rules.min !== undefined && n < rules.min) errors[key] = f.label + ' below minimum.';
        if (rules.max !== undefined && n > rules.max) errors[key] = f.label + ' above maximum.';
      }
      if (f.type === 'email') {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(val))) errors[key] = f.label + ' is not a valid email.';
      }
      if (rules.minLen !== undefined && String(val).length < rules.minLen) errors[key] = f.label + ' too short.';
      if (rules.maxLen !== undefined && String(val).length > rules.maxLen) errors[key] = f.label + ' too long.';
      if (rules.regex && !(new RegExp(rules.regex)).test(String(val))) errors[key] = f.label + ' has invalid format.';
      if (f.type === 'select' && f.options) {
        var opts = [];
        try { opts = JSON.parse(f.options); } catch (e) {}
        if (opts.length && opts.indexOf(val) === -1) errors[key] = f.label + ' is not an allowed value.';
      }
    });
    return { valid: Object.keys(errors).length === 0, errors: errors };
  }
};

/* ============================================================================================
 *  TRANSITION SERVICE
 * ========================================================================================== */

var TransitionService = {
  /** Throw INVALID_TRANSITION if (module: from->to) not allowed for the role. */
  assertTransition: function (module, fromStatus, toStatus, roleId) {
    if (fromStatus === toStatus) return;
    var allowed = ConfigService.getAllowedStatusTransitions(module, roleId);
    var ok = allowed.some(function (t) {
      return t.fromStatus === fromStatus && t.toStatus === toStatus;
    });
    if (!ok) {
      throw apiError_('INVALID_TRANSITION',
        'Transition ' + fromStatus + ' -> ' + toStatus + ' not allowed for ' + module);
    }
  }
};

/* ============================================================================================
 *  IDEMPOTENCY SERVICE
 * ========================================================================================== */

var IdempotencyService = {
  /** Return a prior result reference if this key was already processed, else record + null. */
  checkAndStore: function (key, endpoint, resultRef) {
    if (!key) return null;
    var existing = findRowByKey('IdempotencyKeys', 'idempotencyKey', key);
    if (existing) return existing.resultRef;
    appendRowToSheet('IdempotencyKeys', {
      keyId: generateId(), idempotencyKey: key, endpoint: endpoint,
      resultRef: resultRef || '', createdAt: nowISO()
    });
    return null;
  }
};

/* ============================================================================================
 *  AUDIT SERVICE
 * ========================================================================================== */

var AuditService = {
  logAction: function (userId, action, module, recordId, oldValue, newValue) {
    appendRowToSheet('AuditTrail', {
      auditId: generateId(),
      userId: userId || 'system',
      action: action, module: module, recordId: recordId || '',
      oldValue: oldValue ? JSON.stringify(oldValue) : '',
      newValue: newValue ? JSON.stringify(newValue) : '',
      timestamp: nowISO()
    });
  }
};

/* ============================================================================================
 *  EVENT LOG SERVICE  (-> Alarm evaluation)
 * ========================================================================================== */

var EventLogService = {
  /** Append to EventLog (if enabled) and evaluate alarm rules. */
  logEvent: function (userId, module, eventType, recordId, summary, details) {
    if (!ConfigService.isFeatureEnabled('EventLogEnabled')) return null;
    var event = {
      eventId: generateId(), timestamp: nowISO(),
      userId: userId || 'system', module: module, eventType: eventType,
      recordId: recordId || '', summary: summary || '',
      details: details ? JSON.stringify(details) : ''
    };
    appendRowToSheet('EventLog', event);
    try { AlarmService.evaluateAlarmRules(event); } catch (e) { /* never block on alarm errors */ }
    return event;
  },

  getEvents: function (filters) {
    filters = filters || {};
    var rows = getSheetData('EventLog');
    return rows.filter(function (r) {
      if (filters.module && r.module !== filters.module) return false;
      if (filters.eventType && r.eventType !== filters.eventType) return false;
      if (filters.userId && r.userId !== filters.userId) return false;
      return true;
    });
  }
};

/* ============================================================================================
 *  ALARM SERVICE
 * ========================================================================================== */

var AlarmService = {
  /** Match active AlarmRules against an event; create Alarms + notify. */
  evaluateAlarmRules: function (event) {
    var rules = getSheetData('AlarmRules').filter(function (r) {
      return String(r.isActive).toLowerCase() === 'true' && r.eventType === event.eventType;
    });
    rules.forEach(function (rule) {
      var match = true;
      if (rule.condition) {
        try {
          var cond = JSON.parse(rule.condition); // {field, op, value} on event.details
          var details = event.details ? JSON.parse(event.details) : {};
          match = AlarmService._evalCond_(details, cond);
        } catch (e) { match = true; }
      }
      if (match) {
        AlarmService.createAlarm(rule.alarmRuleId, event.eventId, rule.severity,
          rule.name + ': ' + event.summary, rule.notifyUsers);
      }
    });
  },

  _evalCond_: function (obj, cond) {
    if (!cond || !cond.op) return true;
    var v = obj[cond.field];
    switch (cond.op) {
      case 'eq': return v == cond.value;
      case 'neq': return v != cond.value;
      case 'gt': return Number(v) > Number(cond.value);
      case 'lt': return Number(v) < Number(cond.value);
      case 'contains': return String(v).indexOf(cond.value) !== -1;
      default: return true;
    }
  },

  createAlarm: function (ruleId, eventId, severity, message, notifyUsers) {
    var alarm = {
      alarmId: generateId(), alarmRuleId: ruleId, eventId: eventId,
      triggeredAt: nowISO(), acknowledgedAt: '', acknowledgedBy: '',
      resolvedAt: '', status: 'Active', notes: message || ''
    };
    appendRowToSheet('Alarms', alarm);
    // Mirror into Alerts for in-app surfacing (notification engine arrives in M6).
    var targets = String(notifyUsers || 'admin');
    appendRowToSheet('Alerts', {
      alertId: generateId(), userId: targets, module: 'Alarms', type: 'alarm',
      title: 'Alarm: ' + (severity || 'info'), message: message || '',
      isRead: false, severity: severity || 'warning', channel: 'inapp', createdAt: nowISO()
    });
    return alarm;
  },

  acknowledgeAlarm: function (alarmId, userId) {
    return updateRowByKey('Alarms', 'alarmId', alarmId, {
      status: 'Acknowledged', acknowledgedAt: nowISO(), acknowledgedBy: userId
    });
  },

  resolveAlarm: function (alarmId, userId, notes) {
    return updateRowByKey('Alarms', 'alarmId', alarmId, {
      status: 'Resolved', resolvedAt: nowISO(), acknowledgedBy: userId,
      notes: notes || ''
    });
  }
};
