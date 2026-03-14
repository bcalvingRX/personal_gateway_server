# User Group Model Review

## Plain English Description
This document reviews the user-group schema used by the gateway server to represent authorization groups and their permission relationships.

Earlier artifacts confirmed that the authorization model is:

user  
→ group  
→ permissions

This review checks whether the user-group model safely supports that design by storing group identity and permission references in a way that matches the assumptions already observed in routes, controllers, services, and Redis-backed permission caching.

This matters because group records are the direct source of effective permissions for manager users.

---

## Purpose
Document the security-relevant behavior of `model/user-group.js` and confirm the schema assumptions used by the group-based authorization model.

---

## Main File in Scope

- `model/user-group.js`

Related upstream artifacts:
- `evidence/user_model_review.md`
- `evidence/user_service_review.md`
- `code-paths/usermanagement_controller_path.md`
- `evidence/auth_validation_review.md`

Related model:
- `model/permissions.js`
- `model/gateway-permissions.js`

---

## Model Role

The user-group model represents authorization groups that manager users can belong to.

Earlier review confirmed that:
- users are assigned to one group
- permissions are derived from that group
- editing a group changes effective access for all users in that group
- controller logic invalidates affected Redis permission caches after group changes

So this schema is the persistent source of group-level authorization state.

---

## Confirmed Schema Role

The user-group model stores at least:

- group identity
- permission relationships

This supports the previously confirmed authorization chain:

user  
→ group  
→ permissions

Security relevance:
- group identity must be stable enough for assignment and lookup
- permission relationships must be resolvable and consistent
- schema correctness affects both authorization behavior and cache rebuild correctness

---

## Relationship to Permission Loading

From earlier `user_service_review.md`:
- `getUserPermissions(...)` loads the user
- populates the user’s group
- derives permissions from the populated group

This means the user-group schema is not just admin metadata. It is part of the live authorization decision path.

Security relevance:
- broken or inconsistent group records could produce incorrect effective permissions
- authorization correctness depends on the group schema matching service-layer assumptions

---

## Relationship to Group Editing

From earlier `usermanagement_controller_path.md` and `user_service_review.md`:
- groups can be created
- group permissions can be edited
- group deletion is blocked when users are still assigned
- editing a group triggers Redis permission-cache invalidation for affected users

This means the user-group model supports:
- creation of new authorization structures
- modification of effective permissions
- lookup of affected users through group membership relationships

---

## Permission Relationship Assumptions

Security-relevant expectations for this model are:

- permission entries should be stored in a way that `user.service.js` can resolve consistently
- duplicate or conflicting permission entries should be avoided
- group-permission relationships should support deterministic permission loading

Earlier service review already confirmed:
- duplicate requested permissions are checked during group edit operations

This is a positive control at the service layer, but model/schema alignment still matters.

---

## Group Identity Assumptions

Security-relevant expectations for this model are:

- a group should have a stable identifier
- group references from users should resolve cleanly
- authorization logic assumes one consistent group record per referenced group

If schema constraints are weak, controller/service logic may still function but with less structural safety.

---

## Security-Relevant Observations

1. The user-group model is part of the live authorization decision path.
2. Effective permissions for manager users are derived from group records stored through this schema.
3. Group edits change authorization state for all affected users.
4. Cache invalidation behavior reviewed earlier depends on the stability of group membership and group identity relationships.
5. This model is one of the persistent anchors of the manager permission system.

---

## Positive Controls

- authorization is group-based rather than scattered across direct per-user permission logic
- controller/service review already showed explicit cache invalidation after group permission changes
- duplicate permission requests are checked during group edit operations before storage

---

## Security-Relevant Limitations

### 1. Schema strength determines permission integrity
Even with good route/controller/service logic, authorization can become inconsistent if the schema allows:
- ambiguous group identity
- broken permission relationships
- inconsistent stored permission references

### 2. Group records are high-impact objects
A group edit changes access for multiple users at once. That makes schema correctness and administrative protections especially important.

### 3. Permission correctness depends on both model and service logic
The model stores group/permission relationships, but effective safety depends on:
- route protection
- controller behavior
- service validation
- schema consistency

---

## Resolved Questions

### Does the reviewed authorization model depend on the user-group schema?
Resolved:
- yes, group records are the direct source of effective permissions

### Is the user-group model part of the live auth path rather than passive storage?
Resolved:
- yes, because permission loading populates and reads group records during authorization evaluation

---

## Remaining Questions

1. Is group identity explicitly unique at the schema level?
2. How exactly are permission relationships stored in the schema?
3. Are there schema-level protections against invalid or empty permission references?
4. Do model/index definitions reinforce the assumptions used by `user.service.js` and controller logic?

---

## Impact on Earlier Artifacts

### `user_service_review.md`
Confirmed:
- the group-based permission model depends directly on this schema

### `usermanagement_controller_path.md`
Confirmed:
- permission-changing operations ultimately depend on the integrity of group records stored here

### `auth_validation_review.md`
Updated understanding:
- authorization enforcement depends on correct resolution of group records and their stored permissions

---

## Findings Status

No confirmed finding is recorded from this slice yet.

This schema review supports the existing authorization model and highlights remaining structural questions, but does not by itself establish a code-supported issue.

---

## Next Review Targets

1. any schema/index definitions associated with `model/user-group.js`
   - confirm uniqueness and relationship behavior

2. `model/user.js`
   - re-check user-to-group linkage if schema-level constraints appear weak

3. any admin/bootstrap code outside normal routes/controllers
   - determine whether group records can be changed outside the reviewed protected paths

4. final authorization-surface consolidation
   - combine route, controller, service, Redis, and schema conclusions into one summary