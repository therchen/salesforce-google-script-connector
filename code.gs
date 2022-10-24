function Config(){
  var userProps = PropertiesService.getUserProperties();
  this.apiVersion = 'v53.0';
  this.sandboxMode = false;
  this.client_id = Utilities.newBlob(Utilities.base64Decode(userProps.getProperty("sf_client_id"))).getDataAsString();
  this.client_secret = Utilities.newBlob(Utilities.base64Decode(userProps.getProperty("sf_client_secret"))).getDataAsString();
  this.instanceUrl = Utilities.newBlob(Utilities.base64Decode(userProps.getProperty("sf_instance_url"))).getDataAsString();
  this.password = Utilities.newBlob(Utilities.base64Decode(userProps.getProperty("sf_password"))).getDataAsString();
  this.username = Utilities.newBlob(Utilities.base64Decode(userProps.getProperty("sf_username"))).getDataAsString();
}

function getAndSetAuth2Token() {
  var userProps = PropertiesService.getUserProperties();
  var config = new Config();
  if(config.sandboxMode){
    var tokenUrl = "https://test.salesforce.com/services/oauth2/token";
  }else{
    var tokenUrl = "https://login.salesforce.com/services/oauth2/token";
  }
  var headers = {
    "content-type": "application/x-www-form-urlencoded",
    "method" : "post",
    "muteHttpExceptions" : false,
    "payload": {
      grant_type : "password",
      client_id : config.client_id,
      client_secret : config.client_secret,
      username : config.username,
      password : config.password
    }
  };
  var accessToken = JSON.parse(UrlFetchApp.fetch(tokenUrl, headers)).access_token;
  if(accessToken){
    userProps.setProperty("sf_auth_token", accessToken);
    return accessToken;
  }
  return null;
}

function soqlRequest(soqlStatement) {
  var userProps = PropertiesService.getUserProperties();
  var config = new Config();
  if(!soqlStatement){
    return; 
  }
  var soqlString = "query?q=" + encodeURIComponent(soqlStatement);
  var requestUrl = [config.instanceUrl,"services/data", config.apiVersion, soqlString].join("/");
  var accessToken = getAndSetAuth2Token();
  var options = {
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + accessToken
    }
  };
  var response = UrlFetchApp.fetch(requestUrl, options);
  if(response.getResponseCode() == 401){
    getAndSetAuth2Token();
    soqlRequest(soqlStatement);
  }
  return JSON.parse(response);
}

function recordCreate(request) {
  var userProps = PropertiesService.getUserProperties();
  var config = new Config();  
  var requestUrl = [config.instanceUrl,"services/data", config.apiVersion, "sobjects",  request.object].join("/");
  var accessToken = getAndSetAuth2Token();
  var options = {
    "headers": {
      "Authorization": "Bearer " + accessToken,
      "content-type": "application/json"
    },
    "method": "post",
    "muteHttpExceptions": false,
    "payload": JSON.stringify(request.payload)
  };
  return JSON.parse(UrlFetchApp.fetch(requestUrl, options));
}

function recordDelete(request) {
  var userProps = PropertiesService.getUserProperties();
  var config = new Config();
  var requestUrl = [config.instanceUrl,"services/data", config.apiVersion, "sobjects",  request.object, request.id].join("/");
  var accessToken = getAndSetAuth2Token();
  var options = {
    "headers": {
      "Authorization": "Bearer " + accessToken,
      "content-type": "application/json"
    },
    "method": "delete",
    "muteHttpExceptions": false
  };
  try{
    var response = UrlFetchApp.fetch(requestUrl, options);
    return response.getResponseCode();
  }
  catch(e){
    return;
  }
}

function recordGet(request){
  var userProps = PropertiesService.getUserProperties();
  var config = new Config();
  if(request.relatedObjectName){
          var requestUrl = [config.instanceUrl,"services/data", config.apiVersion, "sobjects",  request.object, request.id, request.relatedObjectName].join("/");
  }
  else{
      var requestUrl = [config.instanceUrl,"services/data", config.apiVersion, "sobjects",  request.object, request.id].join("/");
  }
  var accessToken = getAndSetAuth2Token();
  var options = {
    "headers": {
      "Authorization": "Bearer " + accessToken,
    },
    "muteHttpExceptions": false
  };
  try{
    var response = UrlFetchApp.fetch(requestUrl, options);
    return response;
  }
  catch(e){
    return;
  }
}

function recordUpdate(request) {
  var userProps = PropertiesService.getUserProperties();
  var config = new Config();
    var requestUrl = [config.instanceUrl,"services/data", config.apiVersion, "sobjects",  request.object, request.id].join("/");
  var accessToken = getAndSetAuth2Token();
  var options = {
    "headers": {
      "Authorization": "Bearer " + accessToken,
      "content-type": "application/json"
    },
    "method": "patch",
    "muteHttpExceptions": false,
    "payload": JSON.stringify(request.payload)
  };
  try{
    var response = UrlFetchApp.fetch(requestUrl, options);
    return response.getResponseCode();
  }
  catch(e){
    return;
  }
}

function describeReport(reportId) {
	var config = new Config();
	if (!reportId) {
		return;
	}
	var requestUrl = config.instanceUrl + '/services/data/v50.0/analytics/reports/' + reportId + '/describe';
	var accessToken = getAndSetAuth2Token();
	var options = {
		muteHttpExceptions: true,
		headers: {
			Authorization: "Bearer " + accessToken
		}
	};
	var response = UrlFetchApp.fetch(requestUrl, options);
	if (response.getResponseCode() == 401) {
		getAndSetAuth2Token();
		describeReport(reportId);
	}
	return JSON.parse(response);
}

function doReportDelete(id) {
	var config = new Config();
	var accessToken = getAndSetAuth2Token();
	var requestUrl = config.instanceUrl + "/services/data/v51.0/analytics/reports/" + id;
	var options = {
		"headers": {
			"Authorization": "Bearer " + accessToken,
			"content-type": "application/json"
		},
		"method": "delete",
		"muteHttpExceptions": true
	};
	var response = UrlFetchApp.fetch(requestUrl, options);
}

function doReportsDeleteByFolderId(folderId) {
	if (folderId) {
		var response = soqlRequest("SELECT Id FROM Report WHERE OwnerId = '" + folderId + "'");
		if (response.totalSize > 0) {
			var records = response.records;
			records.forEach(function(record, index, records) {
				doReportDelete(record.Id);
			});
		}
	}
}

function doReportPatch(reportId, reportMetadata) {
	if (!reportId) {
		return;
	}
	var config = new Config();
	var userProps = PropertiesService.getUserProperties();
	var requestUrl = config.instanceUrl + '/services/data/v50.0/analytics/reports/' + reportId;
	var accessToken = getAndSetAuth2Token();
	var options = {
		"headers": {
			"Authorization": "Bearer " + accessToken,
			"content-type": "application/json"
		},
		"method": "patch",
		"muteHttpExceptions": false,
		"payload": JSON.stringify(reportMetadata)
	};
	try {
		var response = UrlFetchApp.fetch(requestUrl, options);
		return response.getResponseCode();
	} catch (e) {
		return;
	}
}

function doReportPost(reportMetadata) {
	if (!reportMetadata) {
		return;
	}
	var config = new Config();
	var requestUrl = config.instanceUrl + '/services/data/v50.0/analytics/reports';
	var accessToken = getAndSetAuth2Token();
	var options = {
		"headers": {
			"Authorization": "Bearer " + accessToken,
			"content-type": "application/json"
		},
		"method": "post",
		"muteHttpExceptions": false,
		"payload": JSON.stringify(reportMetadata)
	};
	try {
		var response = UrlFetchApp.fetch(requestUrl, options);
		if (response.getResponseCode() == 200) {
			return JSON.parse(response).attributes.reportId;
		} else {
			return;
		}
	} catch (e) {
		return;
	}
}

function replaceFieldInReport() {
	var cache = CacheService.getScriptCache();
	if (cache.get('reportIds')) {
		var reportIds = JSON.parse(cache.get('reportIds'));
		for (var i = 0; i < reportIds.length; i++) {
			var reportId = reportIds[i];
			var describeResponse = describeReport(reportId);
			var oldString = JSON.stringify(describeResponse);
			var newString = oldString.replace(/Total_Contract_Value__c[a-z]*/g, "Total_Contract_Value2__c");
			var reportMetadata = JSON.parse(newString);
			var patchResponse = doReportPatch(reportId, reportMetadata);
		}
	}
}

function searchForReportIdsByDeveloperName() {
	var cache = CacheService.getScriptCache();
	var ss = SpreadsheetApp.openById('1QXiO3k7hc3TAAm6mnTrYeye1yjkpfmYYpXR9F5yvDfs');
	var sh = ss.getSheetByName('Paste');
	var reportNames = convert(sh.getRange(1, 1, sh.getLastRow(), 1).getValues());
	var reportIds = [];
	for (var i = 0; i < reportNames.length; i++) {
		var query = "SELECT Id,DeveloperName FROM Report WHERE DeveloperName = '" + reportNames[i] + "'";
		var response = soqlRequest(query);
		if (response.totalSize != 0) {
			var id = response.records[0].Id;
			reportIds.push(id);
		}
	}
	if (reportIds.length > 0) {
		cache.put('reportIds', JSON.stringify(reportIds));
	}
}

function describeDashboard(dashboardId) {
  var salesforceConfig = new Config();
  if(!dashboardId){
    return; 
  }
  var requestUrl = salesforceConfig.instanceUrl + '/services/data/v50.0/analytics/dashboards/' + dashboardId + '/describe';
  var accessToken = getAndSetAuth2Token();
  var options = {
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + accessToken
    }
  };
  var response = UrlFetchApp.fetch(requestUrl, options);
  if(response.getResponseCode() == 401){
    getAndSetAuth2Token();
    describeDashboard(dashboardId);
  }
  return JSON.parse(response);
}

function doDashboardPatch(dashboardId, metadata) {
  if(!dashboardId){
    return; 
  }
  var salesforceConfig = new Config();
  var userProps = PropertiesService.getUserProperties();
  var requestUrl = salesforceConfig.instanceUrl + '/services/data/v50.0/analytics/dashboards/' + dashboardId;
  var accessToken = getAndSetAuth2Token();
  var options = {
    "headers": {
      "Authorization": "Bearer " + accessToken,
      "content-type": "application/json"
    },
    "method": "patch",
    "muteHttpExceptions": false,
    "payload": JSON.stringify(metadata)
  };
  //try{
    var response = UrlFetchApp.fetch(requestUrl, options);
    return JSON.parse(response);
  //}
  //catch(e){
    return;
  //}
}

function doDeleteDashboardComponents(dashboardId){
  var dashboardData = describeDashboard(dashboardId);
  var components = dashboardData.components;
  components.forEach(function(component, index, components){
    var obj = {};
    obj.object = 'DashboardComponent';
    obj.id = component.id;
    recordDelete(obj);
  });
}

function doDashboardDelete(id) {
	var config = new Config();
	var accessToken = getAndSetAuth2Token();
	var requestUrl = config.instanceUrl + "/services/data/v51.0/analytics/dashboards/" + id;
	var options = {
		"headers": {
			"Authorization": "Bearer " + accessToken,
			"content-type": "application/json"
		},
		"method": "delete",
		"muteHttpExceptions": false
	};
	var response = UrlFetchApp.fetch(requestUrl, options);
}

function doDashboardsDeleteByFolderId(folderId) {
	if (folderId) {
		var response = soqlRequest("SELECT Id FROM Dashboard WHERE OwnerId = '" + folderId + "'");
		if (response.totalSize > 0) {
			var records = response.records;
			records.forEach(function(record, index, records) {
				doDashboardDelete(record.Id);
			});
		}
	}
}

