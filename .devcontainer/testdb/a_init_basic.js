db.createUser({
    user: 'rxfunctiongateway',
    pwd: 'testdbpass',
    roles: [
        {
            role: 'readWrite',
            db: 'Walkasin',
        },
    ],
});

db = new Mongo().getDB("Walkasin");

db.createCollection('Permissions', { capped: false });
db.createCollection('UserGroups', { capped: false });
db.createCollection('APIKeys', { capped: false });

db.APIKeys.insertOne( {
  key: '202cb962ac59075b964b07152d234b70',
  type: 'glg_refresh'
})

db.Permissions.insert(
    {
      permissions: [
        {
          description: 'Haptic Module FW (Green Light Guru)',
          location: 'GLG_HM_Firmware',
          names: [ { level: 0, name: 'view' } ]
        },
        {
          description: 'Haptic Module FW (Github)',
          location: 'GH_HM_Firmware',
          names: [ { level: 0, name: 'view' } ]
        },
        {
          description: 'Gateway Users',
          location: 'Users',
          names: [
            { level: 0, name: 'view' },
            { level: 1, name: 'add' },
            { level: 3, name: 'delete' }
          ]
        },
        {
          description: 'User Permission Groups',
          location: 'UserGroups',
          names: [
            { level: 0, name: 'view' },
            { level: 2, name: 'add' },
            { level: 3, name: 'edit' },
            { level: 4, name: 'delete' },
            { level: 1, name: 'apply' }
          ]
        },
        {
          description: 'Product Return Records',
          location: 'ReturnRecords',
          names: [ { level: 0, name: 'view' }, { level: 1, name: 'delete' } ]
        },
        {
          description: 'Report Export Templates',
          location: 'ReportTemplates',
          names: [
            { level: 0, name: 'view' },
            { level: 1, name: 'add' },
            { level: 2, name: 'edit' },
            { level: 3, name: 'delete' }
          ]
        },
        {
          description: 'Systems',
          location: 'Systems',
          names: [ { level: 0, name: 'view' }, { level: 1, name: 'control' } ]
        }
      ]
    }
)

db.UserGroups.insertMany([{
    _id: ObjectId("661d555c2a9f6128c67c2a26"),
    name: 'User Management',
    permissions: [
      { name: 'edit', location: 'UserGroups' },
      { name: 'view', location: 'UserGroups' },
      { name: 'apply', location: 'UserGroups' },
      { name: 'add', location: 'UserGroups' },
      { name: 'delete', location: 'Users' },
      { name: 'delete', location: 'UserGroups' },
      { name: 'view', location: 'Users' },
      { name: 'add', location: 'Users' }
    ],
    canDelete: true,
    canEdit: true
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed89a26"),
    name: 'Firmware And Systems',
    permissions: [
      { name: 'view', location: 'GLG_HM_Firmware' },
      { name: 'view', location: 'GH_HM_Firmware' },
      { name: 'control', location: 'Systems' },
      { name: 'view', location: 'Systems' }
    ],
    canDelete: true,
    canEdit: true
  },
  {
    _id: ObjectId("661e8ec84aa4fccac5721989"),
    name: 'Default Group',
    canDelete: false,
    canEdit: false,
    permissions: []
  },
  {
    _id: ObjectId("661e8ed94aa4fccac572199a"),
    name: 'Admin Group',
    canDelete: false,
    canEdit: false,
    permissions: [
      { name: 'view', location: 'GLG_HM_Firmware' },
      { name: 'view', location: 'GH_HM_Firmware' },
      { name: 'delete', location: 'Users' },
      { name: 'delete', location: 'UserGroups' },
      { name: 'delete', location: 'ReturnRecords' },
      { name: 'delete', location: 'ReportTemplates' },
      { name: 'view', location: 'Users' },
      { name: 'add', location: 'Users' },
      { name: 'view', location: 'UserGroups' },
      { name: 'apply', location: 'UserGroups' },
      { name: 'add', location: 'UserGroups' },
      { name: 'edit', location: 'UserGroups' },
      { name: 'view', location: 'ReturnRecords' },
      { name: 'view', location: 'ReportTemplates' },
      { name: 'add', location: 'ReportTemplates' },
      { name: 'edit', location: 'ReportTemplates' },
      { name: 'view', location: 'Systems' },
      { name: 'control', location: 'Systems' }
    ]
  }
])
