public class LeadTriggerHandler extends TriggerHandler {
    private static String phoneForMerge;

    protected override void afterDelete() {
        if (checkIfEventIsMerge()) {
            List<Lead> mergedLeads = new List<Lead>((List<Lead>) Trigger.old);
            Lead masterRecord = [SELECT CreatedDate, Phone FROM Lead WHERE Id = :mergedLeads[0].MasterRecordId];
            mergedLeads.add(masterRecord);

            findPhoneForMerge(mergedLeads);
        }
    }

    protected override void beforeUpdate() {
        if (phoneForMerge != null) {
            Lead lead = (Lead) Trigger.new[0];
            lead.Phone = phoneForMerge;
        }

        showOldAndNewValues();
    }

    private void findPhoneForMerge(List<Lead> leads) {
        Lead lastCreatedLead = leads[0];

        for (Lead lead : leads) {
            if(lead.CreatedDate > lastCreatedLead.CreatedDate) {
                lastCreatedLead = lead;
            }
        }

        phoneForMerge = lastCreatedLead.Phone;
    }

    private Boolean checkIfEventIsMerge() {
        Lead deletedLead = (Lead) Trigger.old[0];

        return deletedLead.MasterRecordId != null;
    }

    private void showOldAndNewValues() {
        for (Lead oldLead : (List<Lead>) Trigger.old) {
            Lead newLead = (Lead) Trigger.newMap.get(oldLead.Id);
            if (oldLead.Phone != newLead.Phone) {
                System.debug('Old phone ' + oldLead.Phone);
                System.debug('New phone ' + newLead.Phone);
            }
        }
    }
}