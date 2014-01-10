var fluid = fluid || require("universal"),
    when = when || require("when");

var gpii = fluid.registerNamespace("gpii"),
	stat = fluid.registerNamespace("gpii.matchMaker.statistical");
	
fluid.defaults("gpii.matchMaker.statistical", {
     gradeNames: ["autoInit", "fluid.littleComponent"],
     invokers: {
         match: {
             funcName: "gpii.matchMaker.statistical.match",
             args: ["{callbackWrapper}", "{arguments}.0", "{arguments}.1", "{arguments}.3", "{arguments}.2"],
                         dynamic: true
         }
     }
 });

fluid.defaults("gpii.matchMaker.statistical.matchPost", {
    gradeNames: ["autoInit", "fluid.littleComponent"],
    invokers: {
        match: {
            funcName: "gpii.matchMaker.statistical.matchPostMatch",
            args: ["{gpii.matchMaker}", "{that}.when", "{arguments}.0", "{arguments}.1", "{request}.req.body"]
        }
    }
});

gpii.matchMaker.statistical.matchPostMatch = function (matchMaker, when, solutions, preferences, originalModel) {
    var transform = matchMaker.transformer.transformSettings,
        strategy = fluid.getGlobalValue(matchMaker.options.strategy);

    when(matchMaker.match(preferences, solutions, strategy, originalModel), function (matchedSolutions) {
        return transform({
            solutions: matchedSolutions,
            preferences: preferences
        });
    });
};

fluid.defaults("kettle.requests.request.handler.matchPostStatistical", {
    gradeNames: ["autoInit", "fluid.gradeLinkageRecord"],
    contextGrades: ["kettle.requests.request.handler.matchPost"],
    resultGrades: ["gpii.matchMaker.statistical.matchPost"]
});
	
	
	
stat.match = function (preferences, solutions, strategy) {
	// Statistical MM integration:
	preferences = gpii.matchMaker.statistical.infer(preferences);
	// Transformers:
	return when(gpii.matchMaker.disposeSolutions(preferences, solutions, strategy), function (disposed) {
		var togo = [];
		fluid.each(disposed, function(solrec) {
			if (solrec.disposition === "accept") {
				togo.push(solrec.solution);
			}
		});
		return togo;
	});
};

stat.infer = function (preferences) {
	fluid.each(preferences.applications, function(application){
		if (application.id in stat.data) {
			fluid.each(stat.data[application.id], function(inferer){
				try {
					preferences = stat.setInferred(preferences, application.parameters, inferer.key, inferer.value, inferer.data);
				} catch(err) {
					fluid.log(err);
				}
			});
		};
	});
    return preferences;
};

stat.setInferred = function(preferences, parameters, key, value, data){
	var cur = preferences;
	var splittedKey = key.split(".");
	for (var i=1; i<splittedKey.length; i++) {
		if (splittedKey[i] in cur) {
			if (i == splittedKey.length - 1) {return preferences;};
		} else {
			if (i == splittedKey.length - 1) {
				cur[splittedKey[i]]=eval(value);
				return preferences;
			};
			cur[splittedKey[i]]={};
		};
		cur = cur[splittedKey[i]];
	};
}
