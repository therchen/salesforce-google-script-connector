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
