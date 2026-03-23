function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  // 嘗試獲取鎖，避免多人同時寫入衝突
  lock.tryLock(10000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = e.parameter.action || (e.postData && JSON.parse(e.postData.contents).action);
    const payload = e.postData ? JSON.parse(e.postData.contents).payload : {};

    setupSheets(ss);

    let result = {};

    if (action === 'getData') {
      result = getAllData(ss);
    } 
    else if (action === 'initialize') {
      saveAllData(ss, payload);
      result = getAllData(ss);
    }
    else if (action === 'toggleSignup') {
      toggleSignup(ss, payload.date, payload.userId);
      result = getAllData(ss);
    } 
    else if (action === 'updateMemo') {
      updateMemo(ss, payload.date, payload.userId, payload.memo);
      result = getAllData(ss);
    }
    else if (action === 'assignShift') {
      // 擴充支援 note 的儲存
      assignShift(ss, payload.date, payload.confirmedUserId, payload.isClosed, payload.note);
      result = getAllData(ss);
    }
    else if (action === 'manageUser') {
      manageUser(ss, payload.type, payload.user);
      result = getAllData(ss);
    }
    else if (action === 'updateSettings') {
      updateSettings(ss, payload);
      result = getAllData(ss);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Helper: 安全格式化日期
function formatDate(date) {
  if (!date) return '';
  if (Object.prototype.toString.call(date) === '[object Date]') {
     return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(date);
}

function getAllData(ss) {
  const usersSheet = ss.getSheetByName('Users');
  const shiftsSheet = ss.getSheetByName('Shifts');
  const settingsSheet = ss.getSheetByName('Settings');

  // Users
  const usersData = usersSheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][0]) {
      users.push({
        id: String(usersData[i][0]),
        name: usersData[i][1],
        password: usersData[i][2],
        color: usersData[i][3],
        role: usersData[i][4]
      });
    }
  }

  // Shifts
  const shiftsData = shiftsSheet.getDataRange().getValues();
  const shifts = {};
  for (let i = 1; i < shiftsData.length; i++) {
    const date = formatDate(shiftsData[i][0]);
    if (date) {
      shifts[date] = {
        date: date,
        signups: shiftsData[i][1] ? JSON.parse(shiftsData[i][1]) : [],
        confirmedUserId: shiftsData[i][2] || undefined,
        isClosed: shiftsData[i][3] === true || shiftsData[i][3] === 'TRUE',
        note: shiftsData[i][4] || '',
        memos: shiftsData[i][5] ? JSON.parse(shiftsData[i][5]) : {}
      };
    }
  }

  // Settings
  const settingsData = settingsSheet.getDataRange().getValues();
  let settings = { holidays: [], adminPassword: 'admin', googleSheetUrl: '' };
  if (settingsData.length > 1 && settingsData[1][0]) {
    try {
      settings = JSON.parse(settingsData[1][0]);
    } catch(e) {}
  }

  return { users, shifts, settings };
}

function saveAllData(ss, data) {
  const usersSheet = ss.getSheetByName('Users');
  usersSheet.clearContents();
  usersSheet.appendRow(['ID', 'Name', 'Password', 'Color', 'Role']);
  if (data.users && data.users.length > 0) {
    const userRows = data.users.map(u => [u.id, u.name, u.password, u.color, u.role]);
    usersSheet.getRange(2, 1, userRows.length, 5).setValues(userRows);
  }

  const settingsSheet = ss.getSheetByName('Settings');
  settingsSheet.clearContents();
  settingsSheet.appendRow(['JSON_Settings']);
  settingsSheet.appendRow([JSON.stringify(data.settings)]);
  
  if (data.shifts) {
     const shiftsSheet = ss.getSheetByName('Shifts');
     shiftsSheet.clearContents();
     shiftsSheet.appendRow(['Date', 'Signups_JSON', 'ConfirmedUserID', 'IsClosed', 'Note', 'Memos_JSON']);
     const shiftRows = [];
     Object.values(data.shifts).forEach(s => {
       shiftRows.push(["'" + s.date, JSON.stringify(s.signups), s.confirmedUserId || '', s.isClosed || false, s.note || '', JSON.stringify(s.memos || {})]);
     });
     if (shiftRows.length > 0) {
       shiftsSheet.getRange(2, 1, shiftRows.length, 6).setValues(shiftRows);
     }
  }
}

function toggleSignup(ss, dateStr, userId) {
  const sheet = ss.getSheetByName('Shifts');
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (formatDate(data[i][0]) === dateStr) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    const signups = [userId];
    sheet.appendRow(["'" + dateStr, JSON.stringify(signups), '', false, '', '{}']);
  } else {
    const currentJSON = data[rowIndex - 1][1];
    let signups = currentJSON ? JSON.parse(currentJSON) : [];
    if (signups.includes(userId)) {
      signups = signups.filter(id => id !== userId);
    } else {
      signups.push(userId);
    }
    sheet.getRange(rowIndex, 2).setValue(JSON.stringify(signups));
  }
}

function updateMemo(ss, dateStr, userId, memoText) {
  const sheet = ss.getSheetByName('Shifts');
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (formatDate(data[i][0]) === dateStr) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    const memos = {};
    memos[userId] = memoText;
    sheet.appendRow(["'" + dateStr, '[]', '', false, '', JSON.stringify(memos)]);
  } else {
    const currentMemosJSON = data[rowIndex - 1][5]; // Memos_JSON is 6th column
    let memos = currentMemosJSON ? JSON.parse(currentMemosJSON) : {};
    memos[userId] = memoText;
    sheet.getRange(rowIndex, 6).setValue(JSON.stringify(memos));
  }
}

function assignShift(ss, dateStr, confirmedUserId, isClosed, note) {
  const sheet = ss.getSheetByName('Shifts');
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (formatDate(data[i][0]) === dateStr) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    sheet.appendRow(["'" + dateStr, '[]', confirmedUserId || '', isClosed, note || '', '{}']);
  } else {
    sheet.getRange(rowIndex, 3).setValue(confirmedUserId || '');
    sheet.getRange(rowIndex, 4).setValue(isClosed);
    sheet.getRange(rowIndex, 5).setValue(note || '');
  }
}

function manageUser(ss, type, user) {
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  
  if (type === 'add') {
    sheet.appendRow([user.id, user.name, user.password, user.color, user.role]);
  } 
  else if (type === 'delete') {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(user.id)) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
  }
  else if (type === 'edit') {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(user.id)) {
        sheet.getRange(i + 1, 2).setValue(user.name);
        sheet.getRange(i + 1, 3).setValue(user.password);
        sheet.getRange(i + 1, 4).setValue(user.color);
        break;
      }
    }
  }
}

function updateSettings(ss, newSettings) {
  const sheet = ss.getSheetByName('Settings');
  sheet.getRange(2, 1).setValue(JSON.stringify(newSettings));
}

function setupSheets(ss) {
  ['Users', 'Shifts', 'Settings'].forEach(name => {
    const s = ss.getSheetByName(name);
    if (!s) {
      const newSheet = ss.insertSheet(name);
      if (name === 'Users') newSheet.appendRow(['ID', 'Name', 'Password', 'Color', 'Role']);
      if (name === 'Shifts') newSheet.appendRow(['Date', 'Signups_JSON', 'ConfirmedUserID', 'IsClosed', 'Note', 'Memos_JSON']);
      if (name === 'Settings') newSheet.appendRow(['JSON_Settings']);
    } else {
      // 確保欄位標題是最新的 (針對 Shifts)
      if (name === 'Shifts') {
        const header = s.getRange(1, 1, 1, 6).getValues()[0];
        if (header.length < 5 || header[4] !== 'Note') {
           s.getRange(1, 5).setValue('Note');
        }
        if (header.length < 6 || header[5] !== 'Memos_JSON') {
           s.getRange(1, 6).setValue('Memos_JSON');
        }
      }
    }
  });
}
