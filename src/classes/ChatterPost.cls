public class ChatterPost {
    public void postToUserFeed(String feedBody, List<String> topicNames) {
        FeedItem feedItem = new FeedItem();
        feedItem.ParentId = UserInfo.getUserId();
        feedItem.Body = feedBody;
        insert feedItem;

        List<Topic> existingTopics = [SELECT Name FROM Topic WHERE Name IN :topicNames];

        Map<String, Topic> topicsMap = new Map<String, Topic>();
        for (Topic topic : existingTopics) {
            topicsMap.put(topic.Name, topic);
        }

        List<Topic> newTopics = new List<Topic>();
        for (String topicName : topicNames) {
            if (topicsMap.get(topicName) == null) {
                newTopics.add(new Topic(Name = topicName));
            }
        }

        if (newTopics.size() > 0) {
            insert newTopics;

            for (Topic topic : newTopics) {
                topicsMap.put(topic.Name, topic);
            }
        }

        List<TopicAssignment> assignments = new List<TopicAssignment>();
        for (String topicName : topicNames) {
            assignments.add(new TopicAssignment(TopicId = topicsMap.get(topicName).Id, EntityId = feedItem.Id));
        }

        insert assignments;
    }
}