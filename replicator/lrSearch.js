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


document.addEventListener('DOMContentLoaded', function () {
	var qstring = window.location.search.substring(1); // gets the query string from parameters
	snackbar();
	search(qstring);
});

function search (qstring){
	var api_key="e01ce26dae12d45adf53de5659c69fdea691c3882ebfe57b290b400cfe80e6a0";
	var url = "https://search.learningregistry.net/api/search?api_key="+
		api_key +
		"&" + qstring +
		"&facet_filters%5Bstandards%5D%5B%5D=e0d16f274fbf84050162cd7e765d30bd&limit=5";
	$.getJSON(url, function (res) {
		buildSnippets(qstring, res)}); 
}

var metadata = [["Title", "title"], ["Publisher","publisher"],
				["Description", "description"], ["Grades","grades"]];

function buildSnippets(qstring, res){
	var kwords = document.getElementById("kwords");
		kwords.innerHTML = qstring.substring(2);
	
	var NumRes = document.getElementById("NumRes");
		NumRes.innerHTML = res.hits.total;
	
	var clipped = false; 
	if (res.hits.total > 5){
		clipped = true;
	}
	
	var EXPWINcontainer = document.getElementById("EXPWINcontainer");
	for (var i = 0; i < res.hits.hits.length; i++){
		// debugger; console.log(res);
		resURL = res.hits.hits[i]._source.url;
		var resSnippet = document.createElement('DIV'); resSnippet.className = "resSnippet";
		var resID = document.createElement('p');
		var a = document.createElement('a');
			a.setAttribute('href', resURL.toString());
			a.setAttribute('target', '_blank');
			a.innerHTML = resURL.toString();
			
			a.onclick=logClosure({
				action: "visit",
				param: resURL.toString(),
				date: Date()
			}); // does not cancel the navigation event

		resID.appendChild(a);
		resSnippet.appendChild(resID);
		EXPWINcontainer.appendChild(resSnippet);
		
		var myDiv = document.createElement("div"); myDiv.className = "mySnippet";
		for (var j = 0; j < metadata.length; j++){
			var nodeL = document.createTextNode(metadata[j][0] + ": ");
			var nodeR = document.createTextNode(res.hits.hits[i]._source[metadata[j][1]]);
			var snLeft = document.createElement('span'); snLeft.appendChild(nodeL);
				snLeft.className = "snLeft";
			var snRight = document.createElement('span'); snRight.appendChild(nodeR);
				snRight.className = "snRight";
			var myRow = document.createElement('DIV'); myRow.className = "myRow";
			myRow.appendChild(snLeft); myRow.appendChild(snRight);
			myDiv.appendChild(myRow);
			resSnippet.appendChild(myDiv);
		}
	}
	
	if (clipped){
		// proper paging to be added
		var resSnippet = document.createElement('DIV'); resSnippet.className = "resSnippet";
		var resID = document.createElement('p');
		resID.innerHTML = " ... and so on... ";
		resSnippet.appendChild(resID);
		EXPWINcontainer.appendChild(resSnippet);
	}
	
}

function logClosure(action){
	return function log(){
		chrome.storage.local.get("log", function(obj){
				var tmp = (('log' in obj) ? obj.log : []);
				tmp.push(action);
				chrome.storage.local.set({"log" : tmp});
		}
	)}
}

function snackbar() {
    // Get the snackbar DIV
    var x = document.getElementById("snackbar");

    // Add the "show" class to DIV
    x.className = "show";

    // After 3 seconds, remove the show class from DIV
    setTimeout(function(){
					x.className = x.className.replace("show", ""); },
				3000);
}
