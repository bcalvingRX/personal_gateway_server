db.createCollection('Users', { capped: false });

db.Users.insertMany([{
        user: 'brett.nelson@rxfunction.com',
        group: ObjectId('661e8ed94aa4fccac572199a'),
    },{
        user: 'test.admin1@rxfunction.com',
        group: ObjectId('661e8ed94aa4fccac572199a'),
    },
    {
        user: 'test.default2@rxfunction.com',
        group: ObjectId('661e8ec84aa4fccac5721989'),
    },
    {
        user: 'test.usermgmt3@rxfunction.com',
        group: ObjectId('661d555c2a9f6128c67c2a26'),
    },
    {
        user: 'test.gateways4@rxfunction.com',
        group: ObjectId('661d8a7540cb84cb4ed89a26'),
    },
    {
        user: 'test.admin5@rxfunction.com',
        group: ObjectId('661e8ed94aa4fccac572199a'),
    },
    {
        user: 'test.default6@rxfunction.com',
        group: ObjectId('661e8ec84aa4fccac5721989'),
    },
    {
        user: 'test.usermgmt7@rxfunction.com',
        group: ObjectId('661d555c2a9f6128c67c2a26'),
    },
    {
        user: 'test.gateways8@rxfunction.com',
        group: ObjectId('661d8a7540cb84cb4ed89a26'),
    },
    {
        user: 'test.admin9@rxfunction.com',
        group: ObjectId('661e8ed94aa4fccac572199a'),
    },
    {
        user: 'test.default10@rxfunction.com',
        group: ObjectId('661e8ec84aa4fccac5721989'),
    },
    {
        user: 'test.usermgmt11@rxfunction.com',
        group: ObjectId('661d555c2a9f6128c67c2a26'),
    },
    {
        user: 'test.gateways12@rxfunction.com',
        group: ObjectId('661d8a7540cb84cb4ed89a26'),
    },
    {
        user: 'test.admin13@rxfunction.com',
        group: ObjectId('661e8ed94aa4fccac572199a'),
    },
    {
        user: 'test.default14@rxfunction.com',
        group: ObjectId('661e8ec84aa4fccac5721989'),
    },
    {
        user: 'test.usermgmt15@rxfunction.com',
        group: ObjectId('661d555c2a9f6128c67c2a26'),
    },
    {
        user: 'test.gateways16@rxfunction.com',
        group: ObjectId('661d8a7540cb84cb4ed89a26'),
    }
])