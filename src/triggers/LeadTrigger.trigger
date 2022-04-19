trigger LeadTrigger on Lead (before update, before delete, after update, after delete) {
    new LeadTriggerHandler().run();
}