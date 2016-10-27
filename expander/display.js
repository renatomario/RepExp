/*
Expander - Version 1.0

This Chrome extension identifies educational resources similar to the one being visited,
by interacting with the Learning Registry REST services.
Similar resources are identified according to a metric, based on the number of educational alignments
they have in common.
To be used with the companion extension "Replicator"

Note: this is a proof-of-concept prototype (plenty of improvements and extensions planned).
Please send comments to renato.cortinovis (open.ac.uk)

See full documentation with screenshots on GitHub
*/

chrome.runtime.sendMessage({action: 'getData'}, function(response) { 
				snackBar();
				display(response.data, response.scores);
});


function display(resources, scores){
	prepareHistory();
	
	var NumRes = document.getElementById("NumRes");
		NumRes.innerHTML = resources.length;

	var expandedRes = getURLParameter('expandedRes');
		document.getElementById("expandedRes").innerHTML = expandedRes;

	var clipped = false; 
	if (resources.length > 5){
		clipped = true;
		resources = resources.slice(0,4);
	}

	var EXPWINcontainer = document.getElementById("EXPWINcontainer");
	for (var i = 0; i < resources.length; i++){
		var resURL = resources[i];
		var resSnippet = document.createElement('DIV'); resSnippet.className = "resSnippet";
		EXPWINcontainer.appendChild(resSnippet);
		var url = "http://search.learningregistry.net/api/search?api_key=e01ce26dae12d45adf53de5659c69fdea691c3882ebfe57b290b400cfe80e6a0&q=&facet_filters%5Burl%5D%5B%5D=" + resURL;
		$.getJSON(url, createBuildSnippet(resURL, resSnippet)); // via closure
	}
	if (clipped){
		// proper paging to be added
		var resSnippet = document.createElement('DIV'); resSnippet.className="resSnippet";
		var resID = document.createElement('p');
			resID.innerHTML = " ... and so on... ";
		resSnippet.appendChild(resID);
		EXPWINcontainer.appendChild(resSnippet);
	}
}

var metadata = [["Title", "title"],["Publisher","publisher"],["Description", "description"],["Grades","grades"]];
function createBuildSnippet(resURL, resSnippet){
	return  function(res){
		//alert("res in function(res): "+JSON.stringify(res));
		if (res.hits.total == 1) {
			// A: metadata concerning this resource available
			
			var resID = document.createElement('p');
			var a = document.createElement('a');
				a.setAttribute('href', resURL.toString());
				a.setAttribute('target', '_blank');
				a.onclick = logClosure({
					action: "visit",
					url: resURL.toString(),
					param: res.hits.hits[0]._source[metadata[0][1]],
					date: Date()
			}); // does not cancel the navigation event with return false
			a.innerHTML = resURL.toString();
			resID.appendChild(a);
			resSnippet.appendChild(resID);

			var myDiv = document.createElement("div"); myDiv.className = "mySnippet";
			for (var i = 0; i < metadata.length; i++){
				var nodeL = document.createTextNode(metadata[i][0] + ": ");
				var nodeR = document.createTextNode(res.hits.hits[0]._source[metadata[i][1]]);
				var snLeft = document.createElement('span'); snLeft.appendChild(nodeL);
					snLeft.className = "snLeft";
				var snRight = document.createElement('span'); snRight.appendChild(nodeR);
					snRight.className = "snRight";
				var myRow = document.createElement('DIV'); myRow.className = "myRow";
				myRow.appendChild(snLeft); myRow.appendChild(snRight);
				myDiv.appendChild(myRow);
				resSnippet.appendChild(myDiv);
			}
		} else {
			var resID = document.createElement('p');
			var a = document.createElement('a');
				a.setAttribute('href', resURL.toString());
				a.setAttribute('target', '_blank');
				a.onclick=logClosure({
					action: "visit",
					param: "title not available",
					url: resURL.toString(),
					date: Date()
				}); // does not cancel the navigation event with return false
				a.innerHTML = resURL.toString();
				resID.appendChild(a);
				resSnippet.appendChild(resID);
		}
	}
}

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
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

function prepareHistory(){
	chrome.storage.local.get("log",
		function(obj){
			var myDiv = document.createElement("div");
			for(var i = 0; i < obj.log.length; i++){
				//s = s + obj.log[i]["action"] + ": " + obj.log[i]["param"] +"\n"; alert(s);
				console.log(obj);
				var nodeL = document.createTextNode(obj.log[i]["action"] + ": ");
				var nodeR = document.createTextNode(obj.log[i]["param"] + 
							" (" + obj.log[i]["url"] + ")");
				var snLeft = document.createElement('span'); snLeft.appendChild(nodeL);
					snLeft.className = "snLeft";
				var snRight = document.createElement('span'); snRight.appendChild(nodeR);
					snRight.className = "snRight";
				var myRow = document.createElement('DIV'); myRow.className = "myRow";
				myRow.appendChild(snLeft); myRow.appendChild(snRight);
				myDiv.appendChild(myRow);
			}
			var hcont = document.getElementById("history-content");
			hcont.appendChild(myDiv);
		});
}

function snackBar() {
    // Get the snackbar DIV
    var x = document.getElementById("snackbar");

    // Add the "show" class to DIV
    x.className = "show";

    // After 3 seconds, remove the show class from DIV
    setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}