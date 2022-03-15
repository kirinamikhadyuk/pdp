global class BatchCloseOpportunity implements Database.Batchable<sObject>, Schedulable, Database.RaisesPlatformEvents {

    private String queryString;

    public BatchCloseOpportunity(String queryStr) {
        queryString = queryStr;
    }

    global Database.QueryLocator start(Database.BatchableContext context) {
        return Database.getQueryLocator(queryString);
    }

    global void execute(Database.BatchableContext context, List<Opportunity> scope) {
        for (Opportunity opp : scope) {
            opp.StageName = 'Closed Won';
        }
        update scope;
    }

    global void finish(Database.BatchableContext context) {
        BatchCloseOpportunity batch = new BatchCloseOpportunity(queryString);
        System.scheduleBatch(batch, 'Opp batch schedule', 5);
    }

    global void execute(SchedulableContext context) {
        String queryString = 'SELECT Id, Name FROM Opportunity WHERE StageName NOT IN (\'Closed Won\', \'Closed Lost\')';
        BatchCloseOpportunity batch = new BatchCloseOpportunity(queryString);
        Database.executeBatch(batch);
    }
}