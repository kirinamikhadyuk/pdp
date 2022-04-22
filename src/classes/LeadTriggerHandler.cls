public class LeadTriggerHandler extends TriggerHandler {
    private static Map<Id, List<Lead>> oldLeadsByMasterRecordId;

    protected override void afterDelete() {
        fillMapOldLeadsByMasterRecordId(Trigger.old);
    }

    protected override void beforeUpdate() {
        if (oldLeadsByMasterRecordId != null) {
            mergeLeads(oldLeadsByMasterRecordId, (List<Lead>) Trigger.new);
        }

        showOldAndNewValues(Trigger.old, (Map<Id, Lead>) Trigger.newMap);
    }

    private void fillMapOldLeadsByMasterRecordId(List<Lead> oldLeads) {
        oldLeadsByMasterRecordId = new Map<Id, List<Lead>>();

        for (Lead lead : oldLeads) {
            Id masterRecordId = lead.MasterRecordId;

            if (masterRecordId != null) {
                if (oldLeadsByMasterRecordId.get(masterRecordId) != null) {
                    oldLeadsByMasterRecordId.get(masterRecordId).add(lead);
                } else {
                    oldLeadsByMasterRecordId.put(masterRecordId, new List<Lead>{lead});
                }
            }
        }
    }

    private void mergeLeads(Map<Id, List<Lead>> leadMap, List<Lead> masterLeads) {
        for (Lead lead : masterLeads) {
            if (leadMap.get(lead.Id) != null) {
                List<Lead> leadsForMerge = leadMap.get(lead.Id);
                leadsForMerge.add(lead);

                lead.Phone = findPhoneForMerge(leadsForMerge);
            }
        }
    }

    private String findPhoneForMerge(List<Lead> leads) {
        Lead lastCreatedLead = leads[0];

        for (Lead lead : leads) {
            if (lead.CreatedDate > lastCreatedLead.CreatedDate) {
                lastCreatedLead = lead;
            }
        }

        return lastCreatedLead.Phone;
    }

    private void showOldAndNewValues(List<Lead> oldLeads, Map<Id, Lead> newLeads) {
        for (Lead oldLead : oldLeads) {
            Lead newLead = (Lead) newLeads.get(oldLead.Id);
            if (oldLead.Phone != newLead.Phone) {
                System.debug('Old phone ' + oldLead.Phone);
                System.debug('New phone ' + newLead.Phone);
            }
        }
    }
}