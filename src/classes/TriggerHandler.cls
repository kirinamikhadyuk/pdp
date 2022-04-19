public virtual class TriggerHandler {
    public void run() {
        if (Trigger.isBefore && Trigger.isInsert) {
            this.beforeInsert();
        } else if (Trigger.isBefore && Trigger.isUpdate) {
            this.beforeUpdate();
        } else if (Trigger.isBefore && Trigger.isDelete) {
            this.beforeDelete();
        } else if (Trigger.isAfter && Trigger.isInsert) {
            this.afterInsert();
        } else if (Trigger.isAfter && Trigger.isUpdate) {
            this.afterUpdate();
        } else if (Trigger.isAfter && Trigger.isDelete) {
            this.afterDelete();
        } else if (Trigger.isAfter && Trigger.isUndelete) {
            this.afterUndelete();
        }
    }

    protected virtual void beforeInsert() {}
    protected virtual void beforeUpdate() {}
    protected virtual void beforeDelete() {}
    protected virtual void afterInsert() {}
    protected virtual void afterUpdate() {}
    protected virtual void afterDelete() {}
    protected virtual void afterUndelete() {}
}