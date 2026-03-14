const request = require("supertest");
const managerApp = require("../apps/manager-app.js");

describe("Getting Users", () => {
  test("Should require a provided index", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/users/users")
    expect(res.statusCode).not.toBe(200);
  })
  test("Should return 10 users at a time", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/users/users")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
  })
  test("Should paginate results based on provided index", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/users/users")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
    const firstSet = res.body
    res = await request(app)
      .get("/api/users/users")
      .query({ index: 5 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
    const secondSet = res.body

    // Convert entries to JSON strings
    const firstSetJson = firstSet.map(entry => JSON.stringify(entry));
    const secondSetJson = secondSet.map(entry => JSON.stringify(entry));

    // Check that the last five entries of firstSet are the same as the first five entries of secondSet
    expect(firstSetJson.slice(-5)).toEqual(secondSetJson.slice(0, 5));

    // Check that the last five entries of secondSet are different from any entries in firstSet
    const firstSetEntries = new Set(firstSetJson);
    secondSetJson.slice(-5).forEach(entry => {
        expect(firstSetEntries.has(entry)).toBe(false);
    });

    // Check that the first five entries of firstSet are different from any entries in secondSet
    const secondSetEntries = new Set(secondSetJson);
    firstSetJson.slice(0, 5).forEach(entry => {
        expect(secondSetEntries.has(entry)).toBe(false);
    });
  })
  test("Should return a user field as well as a group field for each entry returned", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .get("/api/users/users")
      .query({ index: 0 })
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.length).toBe(10)
    const firstUser = res.body[0]
    expect(firstUser).toHaveProperty("user")
    expect(firstUser).toHaveProperty("group")
    expect(firstUser.user).not.toBeNull();
    expect(firstUser.group).not.toBeNull();
    expect(firstUser.user).not.toBe("");
    expect(firstUser.group).not.toBe("");
  })
    
  test("Should handle exceptions gracefully.", async () => {
    const userService = require('../services/user.service');
    jest.spyOn(userService, 'getUsers').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/users/users")
      .query({ index: 0 })
    expect(res.statusCode).not.toBe(200);
    userService.getUsers.mockRestore();
  });
})

describe("Getting Number of Users", () => {
  test("Should return the number of users", async () => {
    const app = await managerApp.getApp(true)
    let gettingAllUsers = true
    let index = 0
    let expectedNumOfUsers = 0
    while(gettingAllUsers) {
      const getUsersResp = await request(app)
        .get("/api/users/users")
        .query({ index: index })
      index += 10
      expectedNumOfUsers += getUsersResp.body.length
      gettingAllUsers = getUsersResp.body.length === 10
    }
    const res = await request(app)
      .get("/api/users/userCount")
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body).toEqual(expectedNumOfUsers)
  })
    
  test("Should handle exceptions gracefully.", async () => {
    const userService = require('../services/user.service');
    jest.spyOn(userService, 'getNumUsers').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/users/userCount")
    expect(res.statusCode).not.toBe(200);
    userService.getNumUsers.mockRestore();
  });
})

describe("Editing a User", () => {
  test("Should require a valid name and groupId", async () => {
    const app = await managerApp.getApp(true)
    const getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    expect(getUserGroupRes.body[0]).toHaveProperty("_id");
    const userGroupID = getUserGroupRes.body[0]._id
    const getUsersRes = await request(app)
      .get("/api/users/userGroups")
      .query({ index: 0 })
    expect(getUsersRes.statusCode).toBe(200);
    expect(getUsersRes.body.length).toBeGreaterThan(0);
    const firstUser = getUsersRes.body[0].user
    let payload = { }
    let res = await request(app)
      .post("/api/users/editUser")
      .send(payload)
    expect(res.statusCode).not.toBe(200);
    payload = { name: firstUser }
    res = await request(app)
      .post("/api/users/editUser")
      .send(payload)
    expect(res.statusCode).not.toBe(200);
    payload = { groupId: userGroupID }
    res = await request(app)
      .post("/api/users/editUser")
      .send(payload)
    expect(res.statusCode).not.toBe(200);
    payload = { name: userGroupID, groupId: firstUser }
    res = await request(app)
      .post("/api/users/editUser")
      .send(payload)
    expect(res.statusCode).not.toBe(200);
  })
  test("Should change the requested users group to the provided group", async () => {
    const app = await managerApp.getApp(true)
    const getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(1);
    let userGroups = []
    getUserGroupRes.body.forEach(userGroup => {
      userGroups.push(userGroup)
    })
    let getUsersRes = await request(app)
      .get("/api/users/users")
      .query({ index: 0 })
    expect(getUsersRes.statusCode).toBe(200);
    expect(getUsersRes.body.length).toBeGreaterThan(1);
    let users = []
    getUsersRes.body.forEach(user => {
      users.push(user)
    })
    let firstAdjust = {
      name: users[0].user, groupId: userGroups.find(userGroup => userGroup._id !== users[0].group._id)?._id
    }
    let secondAdjust = {
      name: users[1].user, groupId: userGroups.find(userGroup => userGroup._id !== users[1].group._id)?._id
    }
    expect(firstAdjust.groupId).toBeDefined()
    expect(secondAdjust.groupId).toBeDefined()
    let res = await request(app)
      .post("/api/users/editUser")
      .send(firstAdjust)
    expect(res.statusCode).toBe(200);
    res = await request(app)
      .post("/api/users/editUser")
      .send(secondAdjust)
    expect(res.statusCode).toBe(200);
    getUsersRes = await request(app)
      .get("/api/users/users")
      .query({ index: 0 })
    expect(getUsersRes.statusCode).toBe(200);
    expect(getUsersRes.body.length).toBeGreaterThan(1);
    const updatedFirstUser = getUsersRes.body.find(user => user.user === firstAdjust.name)
    const updatedSecondUser = getUsersRes.body.find(user => user.user === secondAdjust.name)
    expect(updatedFirstUser).toBeDefined()
    expect(updatedSecondUser).toBeDefined()
    expect(updatedFirstUser.group._id).toBe(firstAdjust.groupId)
    expect(updatedSecondUser.group._id).toBe(secondAdjust.groupId)
  })
    
  test("Should handle exceptions gracefully.", async () => {
    const userService = require('../services/user.service');
    jest.spyOn(userService, 'setUsersGroup').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .post("/api/users/editUser")
      .send({
        name: 'test.admin1@rxfunction.com', groupId: "661e8ec84aa4fccac5721989"
      })
    expect(res.statusCode).not.toBe(200);
    userService.setUsersGroup.mockRestore();
  });
})

describe("Getting User Permissions", () => {
  test("Should return all user permissions", async () => {
    const app = await managerApp.getApp(true)
    const res = await request(app)
      .get("/api/users/userPermissions")
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined()
    expect(res.body).toHaveProperty("permissions");
    expect(res.body.permissions.length).toBeGreaterThan(0)
  })
    
  test("Should handle exceptions gracefully.", async () => {
    const userService = require('../services/user.service');
    jest.spyOn(userService, 'getAllPermissions').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/users/userPermissions")
    expect(res.statusCode).not.toBe(200);
    userService.getAllPermissions.mockRestore();
  });
})

describe("Getting Groups", () => {
  test("Should return all user groups", async () => {
    const app = await managerApp.getApp(true)
    const res = await request(app)
      .get("/api/users/userGroups")
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined()
    expect(res.body.length).toBeGreaterThan(0)
    res.body.forEach(userGroup => {
      expect(userGroup).toHaveProperty("name")
      expect(userGroup).toHaveProperty("permissions")
      expect(userGroup).toHaveProperty("canDelete")
      expect(userGroup).toHaveProperty("canEdit")
    })
  })
    
  test("Should handle exceptions gracefully.", async () => {
    const userService = require('../services/user.service');
    jest.spyOn(userService, 'getUserGroups').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/users/userGroups")
    expect(res.statusCode).not.toBe(200);
    userService.getUserGroups.mockRestore();
  });
})

describe("Getting Number of Groups", () => {
  test("Should return the number of user groups", async () => {
    const app = await managerApp.getApp(true)
    const getUserGroupsResp = await request(app)
        .get("/api/users/userGroups")
    const expectedNumOfUserGroups = getUserGroupsResp.body.length
    const res = await request(app)
      .get("/api/users/userGroupCount")
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body).toEqual(expectedNumOfUserGroups)
  })
    
  test("Should handle exceptions gracefully.", async () => {
    const userService = require('../services/user.service');
    jest.spyOn(userService, 'getNumUserGroups').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .get("/api/users/userGroupCount")
    expect(res.statusCode).not.toBe(200);
    userService.getNumUserGroups.mockRestore();
  });
})

describe("Creating a User Group", () => {
  test("Should require a name field", async () => {
    const app = await managerApp.getApp(true)
    const res = await request(app)
        .post("/api/users/createUserGroup")
        .send({ })
    expect(res.statusCode).not.toBe(200);
  })
  test("Should ensure group names are unique", async () => {
    const app = await managerApp.getApp(true)
    const getUserGroupsResp = await request(app)
        .get("/api/users/userGroups")
    expect(getUserGroupsResp.statusCode).toBe(200);
    expect(getUserGroupsResp.body).not.toBeNull()
    expect(getUserGroupsResp.body.length).toBeGreaterThan(0)
    expect(getUserGroupsResp.body[0]).toHaveProperty("name")
    const firstUserGroupName = getUserGroupsResp.body[0].name
    const res = await request(app)
        .post("/api/users/createUserGroup")
        .send({ name: firstUserGroupName })
    expect(res.statusCode).not.toBe(200);
  })
  test("Should save a new group with delete and edit flags set to true", async () => {
    const app = await managerApp.getApp(true)
    const uniqueGroupName = `testGrp_${Date.now()}`
    const res = await request(app)
        .post("/api/users/createUserGroup")
        .send({ name: uniqueGroupName })
    expect(res.statusCode).toBe(200);
    const getUserGroupsResp = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupsResp.statusCode).toBe(200);
    expect(getUserGroupsResp.body).not.toBeNull()
    expect(getUserGroupsResp.body.length).toBeGreaterThan(0)
    const createdGroup = getUserGroupsResp.body.find(group => group.name === uniqueGroupName)
    expect(createdGroup).toBeDefined()
    expect(createdGroup).toHaveProperty("canEdit")
    expect(createdGroup).toHaveProperty("canDelete")
    expect(createdGroup.canEdit).toBe(true)
    expect(createdGroup.canDelete).toBe(true)
  })
    
  test("Should handle exceptions gracefully.", async () => {
    const userService = require('../services/user.service');
    const uniqueGroupName = `testGrp_${Date.now()}`
    jest.spyOn(userService, 'createUserGroup').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
        .post("/api/users/createUserGroup")
        .send({ name: uniqueGroupName })
    expect(res.statusCode).not.toBe(200);
    userService.createUserGroup.mockRestore();
  });
})

describe("Editing a User Group", () => {
  test("Should require valid id and permission fields", async () => {
    const app = await managerApp.getApp(true)
    const getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const editableUserGroup = getUserGroupRes.body.find(group => !group.canEdit)
    expect(editableUserGroup).toBeDefined()
    const getPermissionsRes = await request(app)
      .get("/api/users/userPermissions")
    expect(getPermissionsRes.statusCode).toBe(200);
    expect(getPermissionsRes.body).toBeDefined()
    expect(getPermissionsRes.body).toHaveProperty("permissions");
    expect(getPermissionsRes.body.permissions.length).toBeGreaterThan(0)
    const validPermission = [{
        action: "add",
        location: getPermissionsRes.body.permissions[0].location,
        name: getPermissionsRes.body.permissions[0].names[0].name
      }
    ]
    const invalidPermission = [{
        action: "add",
        location: "FakeLocation",
        name: "FakeName"
      }
    ]
    let res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ })
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: editableUserGroup._id })
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ permissions: validPermission })
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: editableUserGroup._id, permissions: invalidPermission  })
    expect(res.statusCode).not.toBe(200);
  })

  test("Should prevent edits to uneditable groups", async () => {
    const app = await managerApp.getApp(true)
    const getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const uneditableUserGroup = getUserGroupRes.body.find(group => !group.canEdit)
    expect(uneditableUserGroup).toBeDefined()
    const getPermissionsRes = await request(app)
      .get("/api/users/userPermissions")
    expect(getPermissionsRes.statusCode).toBe(200);
    expect(getPermissionsRes.body).toBeDefined()
    expect(getPermissionsRes.body).toHaveProperty("permissions");
    expect(getPermissionsRes.body.permissions.length).toBeGreaterThan(0)
    const validPermission = [{
        action: "add",
        location: getPermissionsRes.body.permissions[0].location,
        name: getPermissionsRes.body.permissions[0].names[0].name
      }
    ]
    let res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: uneditableUserGroup._id, permissions: validPermission  })
    expect(res.statusCode).not.toBe(200);
  })

  test("Should prevent adding duplicate permissions", async () => {
    const app = await managerApp.getApp(true)
    const getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const editableUserGroup = getUserGroupRes.body.find(group => group.canEdit && group.permissions.length > 0)
    expect(editableUserGroup).toBeDefined()
    const getPermissionsRes = await request(app)
      .get("/api/users/userPermissions")
    expect(getPermissionsRes.statusCode).toBe(200);
    expect(getPermissionsRes.body).toBeDefined()
    expect(getPermissionsRes.body).toHaveProperty("permissions");
    expect(getPermissionsRes.body.permissions.length).toBeGreaterThan(0)
    const duplicatePermission = [{
        action: "add",
        location: editableUserGroup.permissions[0].location,
        name: editableUserGroup.permissions[0].name
      }
    ]
    let res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: editableUserGroup._id, permissions: duplicatePermission  })
    expect(res.statusCode).not.toBe(200);
  })

  test("Should prevent removing unassigned permissions", async () => {
    const app = await managerApp.getApp(true)
    const getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const getPermissionsRes = await request(app)
      .get("/api/users/userPermissions")
    expect(getPermissionsRes.statusCode).toBe(200);
    expect(getPermissionsRes.body).toBeDefined()
    expect(getPermissionsRes.body).toHaveProperty("permissions");
    expect(getPermissionsRes.body.permissions.length).toBeGreaterThan(0)
    const allPermissions = getPermissionsRes.body.permissions
    const permissionList = []
    allPermissions.forEach(permission => {
      permission.names.forEach(permissionName => {
        permissionList.push({
            action: "remove",
            name: permissionName.name,
            location: permission.location
          }
        )
      })
    })    
    const editableUserGroup = getUserGroupRes.body.find(group => group.canEdit && group.permissions.length < allPermissions.length )
    expect(editableUserGroup).toBeDefined()
    const permissionToRemove = permissionList.find(permission => editableUserGroup.permissions.find(groupPermission =>
        groupPermission.name === permission.name &&
        groupPermission.location === permission.location
      ) === undefined )
    expect(permissionToRemove).toBeDefined()
    let res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: editableUserGroup._id, permissions: [permissionToRemove] })
    expect(res.statusCode).not.toBe(200);
  })

  test("Should allow adding a requested permission", async () => {
    const app = await managerApp.getApp(true)
    let getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const getPermissionsRes = await request(app)
      .get("/api/users/userPermissions")
    expect(getPermissionsRes.statusCode).toBe(200);
    expect(getPermissionsRes.body).toBeDefined()
    expect(getPermissionsRes.body).toHaveProperty("permissions");
    expect(getPermissionsRes.body.permissions.length).toBeGreaterThan(0)
    const allPermissions = getPermissionsRes.body.permissions
    const permissionList = []
    allPermissions.forEach(permission => {
      permission.names.forEach(permissionName => {
        permissionList.push({
            action: "add",
            name: permissionName.name,
            location: permission.location
          }
        )
      })
    })    
    const editableUserGroup = getUserGroupRes.body.find(group => group.canEdit && group.permissions.length < allPermissions.length )
    expect(editableUserGroup).toBeDefined()
    const permissionToAdd = permissionList.find(permission => editableUserGroup.permissions.find(groupPermission =>
        groupPermission.name === permission.name &&
        groupPermission.location === permission.location
      ) === undefined )
    expect(permissionToAdd).toBeDefined()
    let res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: editableUserGroup._id, permissions: [permissionToAdd] })
    expect(res.statusCode).toBe(200);
    getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const userGroupModified = getUserGroupRes.body.find(group => group._id === editableUserGroup._id )
    expect(userGroupModified).toBeDefined()
    const permissionAdded = userGroupModified.permissions.find(permission => 
      permission.name === permissionToAdd.name &&
      permission.location === permissionToAdd.location
    )
    expect(permissionAdded).toBeDefined()
  })

  test("Should allow removing a requested permission", async () => {
    const app = await managerApp.getApp(true)
    let getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const getPermissionsRes = await request(app)
      .get("/api/users/userPermissions")
    expect(getPermissionsRes.statusCode).toBe(200);
    expect(getPermissionsRes.body).toBeDefined()
    expect(getPermissionsRes.body).toHaveProperty("permissions");
    expect(getPermissionsRes.body.permissions.length).toBeGreaterThan(0)
    const allPermissions = getPermissionsRes.body.permissions
    const permissionList = []
    allPermissions.forEach(permission => {
      permission.names.forEach(permissionName => {
        permissionList.push({
            action: "remove",
            name: permissionName.name,
            location: permission.location
          }
        )
      })
    })    
    const editableUserGroup = getUserGroupRes.body.find(group => group.canEdit && group.permissions.length > 0 )
    expect(editableUserGroup).toBeDefined()
    const permissionToRemove = permissionList.find(permission => editableUserGroup.permissions.find(groupPermission =>
        groupPermission.name === permission.name &&
        groupPermission.location === permission.location
      ) !== undefined )
    expect(permissionToRemove).toBeDefined()
    let res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: editableUserGroup._id, permissions: [permissionToRemove] })
    expect(res.statusCode).toBe(200);
    getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const userGroupModified = getUserGroupRes.body.find(group => group._id === editableUserGroup._id )
    expect(userGroupModified).toBeDefined()
    const permissionRemoved = userGroupModified.permissions.find(permission => 
      permission.name === permissionToRemove.name &&
      permission.location === permissionToRemove.location
    )
    expect(permissionRemoved).not.toBeDefined()
  })

  test("Should allow removing and adding permission simultaneously", async () => {
    const app = await managerApp.getApp(true)
    let getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const getPermissionsRes = await request(app)
      .get("/api/users/userPermissions")
    expect(getPermissionsRes.statusCode).toBe(200);
    expect(getPermissionsRes.body).toBeDefined()
    expect(getPermissionsRes.body).toHaveProperty("permissions");
    expect(getPermissionsRes.body.permissions.length).toBeGreaterThan(0)
    const allPermissions = getPermissionsRes.body.permissions
    const permissionList = []
    allPermissions.forEach(permission => {
      permission.names.forEach(permissionName => {
        permissionList.push({
            name: permissionName.name,
            location: permission.location
          }
        )
      })
    })    
    const editableUserGroup = getUserGroupRes.body.find(group => group.canEdit && group.permissions.length < allPermissions.length && group.permissions.length > 0 )
    expect(editableUserGroup).toBeDefined()
    const permissionToRemove = permissionList.find(permission => editableUserGroup.permissions.find(groupPermission =>
        groupPermission.name === permission.name &&
        groupPermission.location === permission.location
      ) !== undefined )
    const permissionToAdd = permissionList.find(permission => editableUserGroup.permissions.find(groupPermission =>
        groupPermission.name === permission.name &&
        groupPermission.location === permission.location
      ) === undefined )
    expect(permissionToRemove).toBeDefined()
    expect(permissionToAdd).toBeDefined()
    permissionToRemove.action = "remove"
    permissionToAdd.action = "add"
    let res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: editableUserGroup._id, permissions: [permissionToRemove, permissionToAdd] })
    expect(res.statusCode).toBe(200);
    getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const userGroupModified = getUserGroupRes.body.find(group => group._id === editableUserGroup._id )
    expect(userGroupModified).toBeDefined()
    const permissionAdded = userGroupModified.permissions.find(permission => 
      permission.name === permissionToAdd.name &&
      permission.location === permissionToAdd.location
    )
    expect(permissionAdded).toBeDefined()
    const permissionRemoved = userGroupModified.permissions.find(permission => 
      permission.name === permissionToRemove.name &&
      permission.location === permissionToRemove.location
    )
    expect(permissionRemoved).not.toBeDefined()
  })

  test("Should prevent a single request from adding and removing the same permission", async () => {
    const app = await managerApp.getApp(true)
    let getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const getPermissionsRes = await request(app)
      .get("/api/users/userPermissions")
    expect(getPermissionsRes.statusCode).toBe(200);
    expect(getPermissionsRes.body).toBeDefined()
    expect(getPermissionsRes.body).toHaveProperty("permissions");
    expect(getPermissionsRes.body.permissions.length).toBeGreaterThan(0)
    const allPermissions = getPermissionsRes.body.permissions
    const permissionList = []
    allPermissions.forEach(permission => {
      permission.names.forEach(permissionName => {
        permissionList.push({
            name: permissionName.name,
            location: permission.location
          }
        )
      })
    })    
    const editableUserGroup = getUserGroupRes.body.find(group => group.canEdit && group.permissions.length < allPermissions.length && group.permissions.length > 0 )
    expect(editableUserGroup).toBeDefined()
    let permissionToAdd = permissionList.find(permission => editableUserGroup.permissions.find(groupPermission =>
        groupPermission.name === permission.name &&
        groupPermission.location === permission.location
      ) === undefined )
    expect(permissionToAdd).toBeDefined()
    let permissionToRemove = {
      name: permissionToAdd.name,
      location: permissionToAdd.location,
    }
    permissionToRemove.action = "remove"
    permissionToAdd.action = "add"
    let res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: editableUserGroup._id, permissions: [permissionToRemove, permissionToAdd] })
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: editableUserGroup._id, permissions: [permissionToAdd, permissionToRemove] })
    expect(res.statusCode).not.toBe(200);
    permissionToRemove = permissionList.find(permission => editableUserGroup.permissions.find(groupPermission =>
      groupPermission.name === permission.name &&
      groupPermission.location === permission.location
    ) !== undefined )
    expect(permissionToAdd).toBeDefined()
    permissionToAdd = {
      name: permissionToRemove.name,
      location: permissionToRemove.location,
    }
    permissionToRemove.action = "remove"
    permissionToAdd.action = "add"
    res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: editableUserGroup._id, permissions: [permissionToRemove, permissionToAdd] })
    expect(res.statusCode).not.toBe(200);
    res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: editableUserGroup._id, permissions: [permissionToAdd, permissionToRemove] })
    expect(res.statusCode).not.toBe(200);
  })

  test("Should add all supporting base permissions when adding a superset permission", async () => {
    const app = await managerApp.getApp(true)
    const uniqueGroupName = `testGrp_${Date.now()}`
    const createUserGroupRes = await request(app)
        .post("/api/users/createUserGroup")
        .send({ name: uniqueGroupName })
    expect(createUserGroupRes.statusCode).toBe(200);
    let getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    const newUserGroup = getUserGroupRes.body.find(group => group.name === uniqueGroupName )
    const getPermissionsRes = await request(app)
      .get("/api/users/userPermissions")
    expect(getPermissionsRes.statusCode).toBe(200);
    expect(getPermissionsRes.body).toBeDefined()
    expect(getPermissionsRes.body).toHaveProperty("permissions");
    expect(getPermissionsRes.body.permissions.length).toBeGreaterThan(0)
    const allPermissions = getPermissionsRes.body.permissions
    const permLocation = allPermissions.find(permission => permission.names.length > 1)
    expect(permLocation).toBeDefined()
    const permissionWithDependencies = permLocation.names.reduce((max, permission) => {
      return (permission.level > max.level) ? permission : max;
    }, permLocation.names[0]);
    expect(permissionWithDependencies).toBeDefined()
    const permissionToAdd = {
      action: "add",
      name: permissionWithDependencies.name,
      location: permLocation.location
    }
    let res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: newUserGroup._id, permissions: [permissionToAdd] })
    expect(res.statusCode).toBe(200);
    getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const userGroupModified = getUserGroupRes.body.find(group => group._id === newUserGroup._id )
    expect(userGroupModified).toBeDefined()
    expect(userGroupModified.permissions.length).toBe(permLocation.names.length)
    permLocation.names.forEach(newPermission => {
      const permissionPresent = userGroupModified.permissions.find(permission => 
        permission.name === newPermission.name &&
        permission.location === permLocation.location
      )
      expect(permissionPresent).toBeDefined()
    })
  })

  test("Should remove all dependent superset permissions when removing a base permission", async () => {
    const app = await managerApp.getApp(true)
    const uniqueGroupName = `testGrp_${Date.now()}`
    const createUserGroupRes = await request(app)
        .post("/api/users/createUserGroup")
        .send({ name: uniqueGroupName })
    expect(createUserGroupRes.statusCode).toBe(200);
    let getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    const newUserGroup = getUserGroupRes.body.find(group => group.name === uniqueGroupName )
    const getPermissionsRes = await request(app)
      .get("/api/users/userPermissions")
    expect(getPermissionsRes.statusCode).toBe(200);
    expect(getPermissionsRes.body).toBeDefined()
    expect(getPermissionsRes.body).toHaveProperty("permissions");
    expect(getPermissionsRes.body.permissions.length).toBeGreaterThan(0)
    const allPermissions = getPermissionsRes.body.permissions
    const permLocation = allPermissions.find(permission => permission.names.length > 1)
    expect(permLocation).toBeDefined()
    const supersetPermission = permLocation.names.reduce((max, permission) => {
      return (permission.level > max.level) ? permission : max;
    }, permLocation.names[0]);
    expect(supersetPermission).toBeDefined()
    const permissionToAdd = {
      action: "add",
      name: supersetPermission.name,
      location: permLocation.location
    }
    let res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: newUserGroup._id, permissions: [permissionToAdd] })
    expect(res.statusCode).toBe(200);
    getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    let userGroupModified = getUserGroupRes.body.find(group => group._id === newUserGroup._id )
    expect(userGroupModified).toBeDefined()
    expect(userGroupModified.permissions.length).toBe(permLocation.names.length)
    permLocation.names.forEach(newPermission => {
      const permissionPresent = userGroupModified.permissions.find(permission => 
        permission.name === newPermission.name &&
        permission.location === permLocation.location
      )
      expect(permissionPresent).toBeDefined()
    })
    const basePermission = permLocation.names.reduce((min, permission) => {
      return (permission.level < min.level) ? permission : min;
    }, permLocation.names[0]);
    const permissionToRemove = {
      action: "remove",
      name: basePermission.name,
      location: permLocation.location
    }
    res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: newUserGroup._id, permissions: [permissionToRemove] })
    expect(res.statusCode).toBe(200);
    getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    userGroupModified = getUserGroupRes.body.find(group => group._id === newUserGroup._id )
    expect(userGroupModified).toBeDefined()
    expect(userGroupModified.permissions.length).toBe(0)
  })
    
  test("Should handle exceptions gracefully.", async () => {
    const userService = require('../services/user.service');
    jest.spyOn(userService, 'editUserGroup').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .post("/api/users/editUserGroup")
      .send({ id: '661d8a7540cb84cb4ed89a26', permissions: [{
        action: "remove",
        name: 'control',
        location:"Systems"
        }] 
      })
    expect(res.statusCode).not.toBe(200);
    userService.editUserGroup.mockRestore();
  });
})
describe("Deleting a User Group", () => {
  test("Should require a provided id", async () => {
    const app = await managerApp.getApp(true)
    let res = await request(app)
      .delete("/api/users/userGroup")
    expect(res.statusCode).not.toBe(200);
  })

  test("Should not delete groups with delete flags set to false", async () => {
    const app = await managerApp.getApp(true)
    const getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    const undeletableGroup = getUserGroupRes.body.find(group => !group.canDelete )
    expect(undeletableGroup).toBeDefined()
    const res = await request(app)
      .delete("/api/users/userGroup")
      .query({ id: undeletableGroup._id })
    expect(res.statusCode).not.toBe(200);
  })

  test("Should not delete groups with users still assigned to it", async () => {
    const app = await managerApp.getApp(true)
    const getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    expect(getUserGroupRes.body.length).toBeGreaterThan(0);
    let searchingForUser = true
    let index = 0
    let userInDeletableGroup = undefined
    while(searchingForUser) {
      const getUsersResp = await request(app)
        .get("/api/users/users")
        .query({ index: index })
      index += 10
      userInDeletableGroup = getUsersResp.body.find(user => user.group.canDelete)
      searchingForUser = userInDeletableGroup === undefined && getUsersResp.body.length === 10
    }
    expect(userInDeletableGroup).toBeDefined()
    const deletableGroupWithUsers = userInDeletableGroup.group._id
    const res = await request(app)
      .delete("/api/users/userGroup")
      .query({ id: deletableGroupWithUsers })
    expect(res.statusCode).not.toBe(200);
  })

  test("Should delete the requested group", async () => {
    const app = await managerApp.getApp(true)
    const uniqueGroupName = `testGrp_${Date.now()}`
    const createUserGroupRes = await request(app)
        .post("/api/users/createUserGroup")
        .send({ name: uniqueGroupName })
    expect(createUserGroupRes.statusCode).toBe(200);
    let getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    let newUserGroup = getUserGroupRes.body.find(group => group.name === uniqueGroupName )
    expect(newUserGroup).toBeDefined()
    const res = await request(app)
      .delete("/api/users/userGroup")
      .query({ id: newUserGroup._id })
    expect(res.statusCode).toBe(200);
    getUserGroupRes = await request(app)
      .get("/api/users/userGroups")
    expect(getUserGroupRes.statusCode).toBe(200);
    newUserGroup = getUserGroupRes.body.find(group => group.name === uniqueGroupName )
    expect(newUserGroup).not.toBeDefined()
  })
    
  test("Should handle exceptions gracefully.", async () => {
    const userService = require('../services/user.service');
    jest.spyOn(userService, 'deleteUserGroup').mockRejectedValue(new Error('Database connection failed'));
    const app = await managerApp.getApp(true);
    let res = await request(app)
      .delete("/api/users/userGroup")
      .query({ id: '661d8a7540cb84cb4ed89a26' })
    expect(res.statusCode).not.toBe(200);
    userService.deleteUserGroup.mockRestore();
  });
})