db.createCollection("init_complete");
db.init_complete.insert({ status: "completed", timestamp: new Date() });