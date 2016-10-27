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


chrome.browserAction.onClicked.addListener(function (tab_something) {
	chrome.tabs.query({active: true, currentWindow: true},
		function (tabs) {
			var param = tabs[0].url;

			if (firstCall == true) {
				chrome.storage.local.clear();
				firstCall = false;
			};
			log({
				action: "expand",
				param: tabs[0].title,
				url: param,
				date: Date()
			});
			
			getStandards(param);
			//display(param, ["one","two","three"], [1,8,9]);
		});
	});

var firstCall=true; // to clear history
const LRNODE = "https://node02.public.learningregistry.net/";
const RESTURL =  LRNODE+"extract/standards-alignment-related/discriminator-by-resource?resource=";

function getStandards(resURL){
	// [M: try via LR Data Services first]
	var standards = [];
	var resturl = RESTURL + resURL + "&ids_only=true"; 
	$.getJSON(resturl, function processResDSStandards(resdocs){
		for (var i = 0; i < resdocs.documents.length; i++){
			standards.push(resdocs.documents[i].result_data.discriminator);	
		};
		// [M: if no results, try with the LR search api]
		if (standards.length!=0) {
			getResourcesViaDS(resURL, standards);
		} else {
			getStandardsViaSA(resURL); 
		}
	}); 
}

function getStandardsViaSA(resURL){
	var standards = [];
	var resturl = "http://search.learningregistry.net/api/search?api_key=e01ce26dae12d45adf53de5659c69fdea691c3882ebfe57b290b400cfe80e6a0&q=&facet_filters%5Burl%5D%5B%5D="
	resturl = resturl + resURL + "&limit=5";
	$.getJSON(resturl, function processResSAStandards(resdocs){
		standards = resdocs.hits.hits[0]._source.standards;
		if (standards.length != 0) getResourcesViaSA(resURL, standards);
	}); 
}

function getResourcesViaDS(resURL, standards){
	var relatedResources = [];
	var counterSemaphore = 0; // number of async calls
	for (var i = 0; i < standards.length; i++){
		counterSemaphore++; // one more async call
		var url = LRNODE + "extract/standards-alignment-related/resource-by-discriminator?discriminator="
		           + standards[i] + "&ids_only=true";
		$.getJSON(url, function getResourcesSameStandardDS(alignDocuments){
			for (var i = 0; i < alignDocuments.documents.length; i++){
				relatedResources.push(alignDocuments.documents[i].result_data.resource);
			}
			counterSemaphore--; // one more async call terminated
			if (counterSemaphore == 0) { // all asynchronous calls terminated, this must be the last one
				if (relatedResources.length != 0) rank(resURL, relatedResources);
			}
		}); 
	}
}

function getResourcesViaSA(resURL, standards){
	var relatedResources = [];
	var counterSemaphore = 0; // number of async calls
	for (var i = 0; i < standards.length; i++){
		counterSemaphore++; // one more async call
		var url = "http://search.learningregistry.net/api/search?api_key=e01ce26dae12d45adf53de5659c69fdea691c3882ebfe57b290b400cfe80e6a0&q=&facet_filters[standards][]="+standards[i]; // +"&limit=5"
		$.getJSON(url, function getResourcesSameStandardSA(alignDocuments){
			for (var i = 0; i < alignDocuments.hits.hits.length; i++){
				relatedResources.push(alignDocuments.hits.hits[i]._source.url);
			}
			counterSemaphore--; // one more async call terminated
			if (counterSemaphore == 0) { // all asynchronous calls terminated, this must be the last one
				if (relatedResources.length != 0) rank(resURL, relatedResources);
			}
		}); 
	}
}

function rank (resURL, relatedResources){
	// M: eliminate itself from related resources:
	for(var i = relatedResources.length - 1; i--;){
		if (relatedResources[i] === resURL) relatedResources.splice(i, 1);
	}

	// M: construct a set with all unique related resources: 
	var mySet = new Set(relatedResources); // to make sure every element is unique

	// M: transform set to a more convenient object sim:
	var sim = {};
	mySet.forEach(function(item) {
		sim[item] = 0; //  prepare to compute similarity vector
	});

	// M: compute similarity vector sim{res0:integer, res1:integer} 
	relatedResources.forEach(function(item) {
		sim[item]++;
	});

	// M: sort similarity vector
	var rankedRelatedResources = Object.keys(sim).sort(function(a,b){return sim[b] - sim[a]});

	var scores = [];
	for (var i = 0; i < rankedRelatedResources.length; i++){
		scores[i] = sim[rankedRelatedResources[i]];
	}
	//alert ("Ranked similar resources: \n"+JSON.stringify(rankedRelatedResources, null, 2));
	display(resURL, rankedRelatedResources, scores);
}

function display(resURL, rankedRelatedResources, scores){

	//var fakedData=["http://illuminations.nctm.org/Lesson.aspx?id=3242","http://www.learner.org/courses/learningmath/data/session7/part_c/","http://illuminations.nctm.org/LessonDetail.aspx?ID=L248","http://illuminations.nctm.org/LessonDetail.aspx?id=L865","http://illuminations.nctm.org/LessonDetail.aspx?id=L879"];

	chrome.runtime.onMessage.addListener(ascolta);
	
	var url = "display.html?expandedRes=" + resURL; // expanded resource
	chrome.tabs.update({'url': url, 'active': true}); // update-->create to open in new tabs

	function ascolta (request, sender, sendResponse) {
		if(request.action === 'getData') {
			sendResponse({ data: rankedRelatedResources,
							scores: scores
			});
			chrome.runtime.onMessage.removeListener(ascolta); // to avoid multiple listeners following multiple selections 
		}
	}
}
function log(action){
	// alert("expander logging: "+JSON.stringify(action));
	chrome.storage.local.get("log",
		function(obj){
			var tmp = (('log' in obj) ? obj.log : []); // or Object.keys(obj).length === 0;
			tmp.push(action);
			// alert("expander storing: "+JSON.stringify(action));
			chrome.storage.local.set({"log":tmp});
		}
	)
}



