/*
	Copyright 2016 Renato Cortinovis

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/

/*
Replicator - Version 1.0

This Chrome extension transparently replicates a Google search on the Learning Registry,
by interacting with its REST services.
To be used with the companion extension "Expander"

Note: this is a proof-of-concept prototype (plenty of improvements and extensions planned).
Please send comments to renato.cortinovis (open.ac.uk)

See full documentation with screenshots on GitHub
*/

// When the extension is installed or upgraded ...
chrome.runtime.onInstalled.addListener(function() {

  // replace all rules ...
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    // with a new rule ...
    chrome.declarativeContent.onPageChanged.addRules([
      {
        // that fires when a page's URL contains 'google,' ...
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlContains: 'google.' },
          })
        ],
        // and shows the extension's page action.
        actions: [ new chrome.declarativeContent.ShowPageAction() ]
      }
    ]);
  });
});

// When the user clicks on the page action...
chrome.pageAction.onClicked.addListener(function(tab) {
	chrome.storage.local.clear();  // clear history... (better under user control?)
	var param = getUrlParameter (tab.url, 'q');

	log({  // log the current search action...
		action: "keywords search",
		param: param,
		date: Date()
	});

	var urlToOpen = "lrSearch.html?q=" + param;
    chrome.tabs.update({url: urlToOpen, 'active': true}); // alt update--> create, to open a different tab
});

var getUrlParameter = function getUrlParameter(url, sParam) {
    var 
		murl = url.replace("#","&"), // new Google query format...
		murl = murl.replace("?","&"), // old search? format - works as anonymous or yahoo...
		sURLVariables = murl.split("&"),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

function log(action){
	chrome.storage.local.get("log",
		function(obj){
			var tmp = (('log' in obj) ? obj.log : []);
			tmp.push(action);
			// alert("replicator logging: "+JSON.stringify(tmp));
			chrome.storage.local.set({"log" : tmp});
		}
	)
}
