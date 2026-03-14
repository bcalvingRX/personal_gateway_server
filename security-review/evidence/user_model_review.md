# User Model Review

## Plain English Description
This document reviews the user schema used by the gateway server to store manager-side identity and authorization state.

Earlier artifacts confirmed that the authorization model is based on:

- user records
- group membership
- permissions derived from groups
- Redis-backed permission caching

This review checks whether the underlying user model supports those assumptions safely and consistently.

This matters because even well-structured route, controller, and service logic depends on the schema correctly representing identity and group relationships.

---

## Purpose
Document the security-relevant behavior of `model/user.js` and confirm the schema assumptions used by the authorization and user-management paths.

---

## Main File in Scope

- `model/user.js`

Related upstream artifacts:
- `evidence/user_service_review.md`
- `code-paths/usermanagement_controller_path.md`
- `code-paths/manager_auth_permission_path.md`

Related model:
- `model/user-group.js`

---

## Model Role

The user model represents manager-side identities that can authenticate and receive permissions through group membership.

Earlier review confirmed that user records are:
- auto-created during auth-related flows
- assigned to a group
- later used to derive effective permissions

So this schema is the persistent anchor for the manager authorization model.

---

## Confirmed Schema Role

The user model stores at least:

- user identity
- group reference

This supports the previously confirmed auth chain:

user  
→ group  
→ permissions

Security relevance:
- user identity must be stable and unique enough for authorization lookups
- group reference must reliably point to the correct authorization grouping
- schema behavior affects cache correctness and effective permission evaluation

---

## Identity Field Assumptions

Earlier service/controller review showed that user records are typically looked up by the user identity value passed from authentication flows, usually email-based identity.

Security-relevant expectations for this model are:

- the identity field should uniquely represent a manager user
- duplicate user records for the same identity would weaken authorization correctness
- the model should consistently support lookup by the same identity used in auth flows

If the schema does not strongly support uniqueness, the service-layer assumptions become weaker.

---

## Group Reference Assumptions

Earlier review confirmed:
- users are assigned to one group
- permissions are derived from that group
- group changes alter effective authorization state

Security-relevant expectations for this model are:

- group reference should point to a valid user-group record
- authorization logic assumes the group relationship is stable and resolvable
- broken or inconsistent references could cause incorrect permission behavior

---

## Relationship to Auto-Provisioning

From earlier `user_service_review.md`:
- `createUser(...)` auto-provisions users
- first user receives `"Admin Group"`
- later users receive `"Default Group"`

This means the user schema is not just passive storage. It is part of the bootstrap trust model.

Security relevance:
- if schema constraints are weak, bootstrap and later user-creation behavior may become inconsistent
- if identity uniqueness is not enforced, auto-provisioning may create duplicate or ambiguous records

---

## Relationship to Cache Keys

From earlier Redis/auth review:
- Redis permission cache keys use the user identity value
- services/controllers assume one effective authorization identity per user

This means the schema and cache design should align:

one logical user  
→ one user record  
→ one group reference  
→ one permission-cache key identity

Any mismatch between schema identity and cache identity could weaken authorization correctness.

---

## Security-Relevant Observations

1. The user model is a core part of the manager authorization system.
2. Authorization behavior depends on stable mapping between authenticated identity and one user record.
3. Group-based permission loading assumes the group reference is valid and resolvable.
4. Auto-provisioning makes schema correctness especially important because records are created as part of auth-related flows.
5. Redis permission caching depends on identity consistency between schema lookups and cache keys.

---

## Positive Controls

- user/group/permission separation is cleaner than storing permissions directly on the user record
- the schema supports the group-based authorization model used throughout the reviewed code
- the design aligns with controller/service logic already reviewed

---

## Security-Relevant Limitations

### 1. Schema strength determines auth correctness
Even with good controller and service logic, authorization can become inconsistent if the schema allows:
- duplicate identities
- broken group references
- ambiguous lookups

### 2. Auto-provisioning increases schema importance
Because the system creates users automatically, the user model is part of a live auth path rather than just an admin-only maintenance structure.

### 3. Cache correctness depends on model identity consistency
If the stored identity does not match the identity used in auth and cache lookups, permission behavior could drift.

---

## Resolved Questions

### Does the reviewed authorization model depend on the user schema?
Resolved:
- yes, the schema is foundational to the user → group → permissions model

### Is the user model part of the auth path rather than just storage?
Resolved:
- yes, because users are auto-created and later used directly in permission evaluation

---

## Remaining Questions

1. Is the user identity field explicitly unique at the schema level?
2. Is the group reference strongly typed and required?
3. Are there any schema-level protections against invalid or missing group assignments?
4. Does the model include any fields that could weaken identity consistency across auth and cache paths?

---

## Impact on Earlier Artifacts

### `user_service_review.md`
Confirmed:
- the service’s authorization assumptions depend directly on user-model identity and group reference behavior

### `manager_auth_permission_path.md`
Confirmed:
- the manager auth path ultimately depends on stable user identity lookup in this model

### `permission_cache_invalidation_path.md`
Updated understanding:
- cache correctness depends not only on invalidation, but also on the schema’s ability to represent one stable authorization identity per user

---

## Findings Status

No confirmed finding is recorded from this slice yet.

This schema review reinforces earlier conclusions but does not by itself establish a code-supported issue.

---

## Next Review Targets

1. `model/user-group.js`
   - confirm schema assumptions about stored group and permission relationships

2. `services/user.service.js`
   - revisit if model constraints appear weaker than service assumptions

3. any schema/index definitions associated with the user model
   - confirm identity uniqueness and lookup behavior