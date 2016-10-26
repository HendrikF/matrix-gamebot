'use strict';

function SchemaManager(opts) {
    this.prepareSchemaTable = opts.prepareSchemaTable;
    this.getAvailableChanges = opts.getAvailableChanges;
    this.getAppliedChanges = opts.getAppliedChanges;
    this.applyChange = opts.applyChange;
}

SchemaManager.prototype.run = function(callback) {
    var self = this;
    self.prepareSchemaTable(function() {
        self.getAvailableChanges(function(availableChanges) {
            self.getAppliedChanges(function(appliedChanges) {

                // check for consistency
                for (var i in appliedChanges) {
                    var change = appliedChanges[i];
                    if (availableChanges.indexOf(change) === -1) {
                        throw "database consistency error: change '" +
                            change + "' is not available!";
                    }
                }
                
                // calculate changes to be applied
                var changesToApply = [];
                var previousChangeHadToBeApplied = false;
                for (var i in availableChanges) {
                    var change = availableChanges[i];
                    if (appliedChanges.indexOf(change) === -1) {
                        changesToApply.push(change);
                        previousChangeHadToBeApplied = true;
                    } else if (previousChangeHadToBeApplied) {
                        throw "changes can only be inserted at the end to keep consistency!";
                    }
                }

                // eventually apply changes
                if (changesToApply) {
                    // everything asynchronously
                    var idx = -1;
                    
                    function apply() {
                        idx++;
                        if (idx >= changesToApply.length) {
                            callback();
                            return;
                        }
                        self.applyChange(changesToApply[idx], apply);
                    }
                    
                    apply();
                } else {
                    callback();
                }
                
            });
        });
    });
}

module.exports = SchemaManager;
