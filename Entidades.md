## Customer
 
### Schema
 
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes |  |
| `email` | string | Yes |  |
| `company` | string | Yes |  |
| `role` | string |  |  |
| `sector` | string |  |  |
| `company_size` | `1-10`, `11-50`, `51-200`, `201-500`, `501-1000`, `1000+` |  |  |
| `registered_by` | `self`, `admin` |  |  |
| `language` | `pt`, `en` |  |  |
| `phone` | string |  |  |
| `notes` | string |  |  |
| `account_manager_id` | string |  |  |
| `id` | string |  | Unique record identifier |
| `created_date` | string |  | Record creation timestamp |
| `updated_date` | string |  | Record last update timestamp |
| `created_by_id` | string |  | ID of the user who created the record |
 
### Endpoints
 
### `GET /entities/Customer`
List Customer records
 
**Parameters:**
- `q` (query): JSON query filter, e.g. {"status":"active"}
- `limit` (query): Maximum number of records to return
- `skip` (query): Number of records to skip (pagination)
- `sort_by` (query): Field name to sort by. Prefix with '-' for descending order, e.g. -created_date
 
```javascript
const records = await base44.entities.Customer.list();
```
 
### `POST /entities/Customer`
Create a Customer record
 
```javascript
const record = await base44.entities.Customer.create({
  // your data
});
```
 
### `DELETE /entities/Customer`
Delete multiple Customer records
 
```javascript
await base44.entities.Customer.deleteMany({
  // query filter — WARNING: empty {} deletes ALL records
  name: "Example name"
});
```
 
### `POST /entities/Customer/bulk`
Bulk create Customer records
 
```javascript
const records = await base44.entities.Customer.bulkCreate([
  { /* record 1 */ },
  { /* record 2 */ },
]);
```
 
### `PUT /entities/Customer/bulk`
Bulk update Customer records
 
```javascript
// bulk-update is not available via SDK — use the REST API
```
 
### `PATCH /entities/Customer/update-many`
Update many Customer records by query
 
```javascript
// update-many is not available via SDK — use the REST API
```
 
### `GET /entities/Customer/{Customer_id}`
Get a Customer record by ID
 
**Parameters:**
- `Customer_id` (path): Record ID
 
```javascript
const record = await base44.entities.Customer.get(recordId);
```
 
### `PUT /entities/Customer/{Customer_id}`
Update a Customer record
 
**Parameters:**
- `Customer_id` (path): Record ID
 
```javascript
const record = await base44.entities.Customer.update(recordId, {
  // fields to update
});
```
 
### `DELETE /entities/Customer/{Customer_id}`
Delete a Customer record
 
**Parameters:**
- `Customer_id` (path): Record ID
 
```javascript
await base44.entities.Customer.delete(recordId);
```
 
### `PUT /entities/Customer/{Customer_id}/restore`
Restore a deleted Customer record
 
**Parameters:**
- `Customer_id` (path): Record ID
 
```javascript
const record = await base44.entities.Customer.restore(recordId);
```
 
## Assessment
 
### Schema
 
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `customer_id` | string | Yes |  |
| `status` | `not_started`, `in_progress`, `completed` |  |  |
| `started_at` | string |  |  |
| `completed_at` | string |  |  |
| `global_score` | number |  |  |
| `maturity_level` | string |  |  |
| `pillar_scores` | string |  |  |
| `language` | `pt`, `en` |  |  |
| `assessment_type` | `main`, `sub_assessment` |  |  |
| `parent_assessment_id` | string |  |  |
| `sub_assessment_for_pillar` | string |  |  |
| `reviewed_by_consultant` | boolean |  |  |
| `id` | string |  | Unique record identifier |
| `created_date` | string |  | Record creation timestamp |
| `updated_date` | string |  | Record last update timestamp |
| `created_by_id` | string |  | ID of the user who created the record |
 
### Endpoints
 
### `GET /entities/Assessment`
List Assessment records
 
**Parameters:**
- `q` (query): JSON query filter, e.g. {"status":"active"}
- `limit` (query): Maximum number of records to return
- `skip` (query): Number of records to skip (pagination)
- `sort_by` (query): Field name to sort by. Prefix with '-' for descending order, e.g. -created_date
 
```javascript
const records = await base44.entities.Assessment.list();
```
 
### `POST /entities/Assessment`
Create a Assessment record
 
```javascript
const record = await base44.entities.Assessment.create({
  // your data
});
```
 
### `DELETE /entities/Assessment`
Delete multiple Assessment records
 
```javascript
await base44.entities.Assessment.deleteMany({
  // query filter — WARNING: empty {} deletes ALL records
  customer_id: "Example customer_id"
});
```
 
### `POST /entities/Assessment/bulk`
Bulk create Assessment records
 
```javascript
const records = await base44.entities.Assessment.bulkCreate([
  { /* record 1 */ },
  { /* record 2 */ },
]);
```
 
### `PUT /entities/Assessment/bulk`
Bulk update Assessment records
 
```javascript
// bulk-update is not available via SDK — use the REST API
```
 
### `PATCH /entities/Assessment/update-many`
Update many Assessment records by query
 
```javascript
// update-many is not available via SDK — use the REST API
```
 
### `GET /entities/Assessment/{Assessment_id}`
Get a Assessment record by ID
 
**Parameters:**
- `Assessment_id` (path): Record ID
 
```javascript
const record = await base44.entities.Assessment.get(recordId);
```
 
### `PUT /entities/Assessment/{Assessment_id}`
Update a Assessment record
 
**Parameters:**
- `Assessment_id` (path): Record ID
 
```javascript
const record = await base44.entities.Assessment.update(recordId, {
  // fields to update
});
```
 
### `DELETE /entities/Assessment/{Assessment_id}`
Delete a Assessment record
 
**Parameters:**
- `Assessment_id` (path): Record ID
 
```javascript
await base44.entities.Assessment.delete(recordId);
```
 
### `PUT /entities/Assessment/{Assessment_id}/restore`
Restore a deleted Assessment record
 
**Parameters:**
- `Assessment_id` (path): Record ID
 
```javascript
const record = await base44.entities.Assessment.restore(recordId);
```
 
## AssessmentAnswer
 
### Schema
 
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `assessment_id` | string | Yes |  |
| `question_id` | string | Yes |  |
| `question_code` | string |  |  |
| `pillar_code` | string |  |  |
| `value` | number | Yes |  |
| `id` | string |  | Unique record identifier |
| `created_date` | string |  | Record creation timestamp |
| `updated_date` | string |  | Record last update timestamp |
| `created_by_id` | string |  | ID of the user who created the record |
 
### Endpoints
 
### `GET /entities/AssessmentAnswer`
List AssessmentAnswer records
 
**Parameters:**
- `q` (query): JSON query filter, e.g. {"status":"active"}
- `limit` (query): Maximum number of records to return
- `skip` (query): Number of records to skip (pagination)
- `sort_by` (query): Field name to sort by. Prefix with '-' for descending order, e.g. -created_date
 
```javascript
const records = await base44.entities.AssessmentAnswer.list();
```
 
### `POST /entities/AssessmentAnswer`
Create a AssessmentAnswer record
 
```javascript
const record = await base44.entities.AssessmentAnswer.create({
  // your data
});
```
 
### `DELETE /entities/AssessmentAnswer`
Delete multiple AssessmentAnswer records
 
```javascript
await base44.entities.AssessmentAnswer.deleteMany({
  // query filter — WARNING: empty {} deletes ALL records
  assessment_id: "Example assessment_id"
});
```
 
### `POST /entities/AssessmentAnswer/bulk`
Bulk create AssessmentAnswer records
 
```javascript
const records = await base44.entities.AssessmentAnswer.bulkCreate([
  { /* record 1 */ },
  { /* record 2 */ },
]);
```
 
### `PUT /entities/AssessmentAnswer/bulk`
Bulk update AssessmentAnswer records
 
```javascript
// bulk-update is not available via SDK — use the REST API
```
 
### `PATCH /entities/AssessmentAnswer/update-many`
Update many AssessmentAnswer records by query
 
```javascript
// update-many is not available via SDK — use the REST API
```
 
### `GET /entities/AssessmentAnswer/{AssessmentAnswer_id}`
Get a AssessmentAnswer record by ID
 
**Parameters:**
- `AssessmentAnswer_id` (path): Record ID
 
```javascript
const record = await base44.entities.AssessmentAnswer.get(recordId);
```
 
### `PUT /entities/AssessmentAnswer/{AssessmentAnswer_id}`
Update a AssessmentAnswer record
 
**Parameters:**
- `AssessmentAnswer_id` (path): Record ID
 
```javascript
const record = await base44.entities.AssessmentAnswer.update(recordId, {
  // fields to update
});
```
 
### `DELETE /entities/AssessmentAnswer/{AssessmentAnswer_id}`
Delete a AssessmentAnswer record
 
**Parameters:**
- `AssessmentAnswer_id` (path): Record ID
 
```javascript
await base44.entities.AssessmentAnswer.delete(recordId);
```
 
### `PUT /entities/AssessmentAnswer/{AssessmentAnswer_id}/restore`
Restore a deleted AssessmentAnswer record
 
**Parameters:**
- `AssessmentAnswer_id` (path): Record ID
 
```javascript
const record = await base44.entities.AssessmentAnswer.restore(recordId);
```
 
## Pillar
 
### Schema
 
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | Yes |  |
| `name_pt` | string | Yes |  |
| `name_en` | string |  |  |
| `weight` | number | Yes |  |
| `order` | number |  |  |
| `icon` | string |  |  |
| `description_pt` | string |  |  |
| `description_en` | string |  |  |
| `assessment_type` | `main`, `sub_assessment` |  |  |
| `id` | string |  | Unique record identifier |
| `created_date` | string |  | Record creation timestamp |
| `updated_date` | string |  | Record last update timestamp |
| `created_by_id` | string |  | ID of the user who created the record |
 
### Endpoints
 
### `GET /entities/Pillar`
List Pillar records
 
**Parameters:**
- `q` (query): JSON query filter, e.g. {"status":"active"}
- `limit` (query): Maximum number of records to return
- `skip` (query): Number of records to skip (pagination)
- `sort_by` (query): Field name to sort by. Prefix with '-' for descending order, e.g. -created_date
 
```javascript
const records = await base44.entities.Pillar.list();
```
 
### `POST /entities/Pillar`
Create a Pillar record
 
```javascript
const record = await base44.entities.Pillar.create({
  // your data
});
```
 
### `DELETE /entities/Pillar`
Delete multiple Pillar records
 
```javascript
await base44.entities.Pillar.deleteMany({
  // query filter — WARNING: empty {} deletes ALL records
  code: "Example code"
});
```
 
### `POST /entities/Pillar/bulk`
Bulk create Pillar records
 
```javascript
const records = await base44.entities.Pillar.bulkCreate([
  { /* record 1 */ },
  { /* record 2 */ },
]);
```
 
### `PUT /entities/Pillar/bulk`
Bulk update Pillar records
 
```javascript
// bulk-update is not available via SDK — use the REST API
```
 
### `PATCH /entities/Pillar/update-many`
Update many Pillar records by query
 
```javascript
// update-many is not available via SDK — use the REST API
```
 
### `GET /entities/Pillar/{Pillar_id}`
Get a Pillar record by ID
 
**Parameters:**
- `Pillar_id` (path): Record ID
 
```javascript
const record = await base44.entities.Pillar.get(recordId);
```
 
### `PUT /entities/Pillar/{Pillar_id}`
Update a Pillar record
 
**Parameters:**
- `Pillar_id` (path): Record ID
 
```javascript
const record = await base44.entities.Pillar.update(recordId, {
  // fields to update
});
```
 
### `DELETE /entities/Pillar/{Pillar_id}`
Delete a Pillar record
 
**Parameters:**
- `Pillar_id` (path): Record ID
 
```javascript
await base44.entities.Pillar.delete(recordId);
```
 
### `PUT /entities/Pillar/{Pillar_id}/restore`
Restore a deleted Pillar record
 
**Parameters:**
- `Pillar_id` (path): Record ID
 
```javascript
const record = await base44.entities.Pillar.restore(recordId);
```
 
## Question
 
### Schema
 
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `pillar_code` | string | Yes |  |
| `code` | string | Yes |  |
| `text_pt` | string | Yes |  |
| `text_en` | string |  |  |
| `anchor_1_pt` | string |  |  |
| `anchor_2_pt` | string |  |  |
| `anchor_3_pt` | string |  |  |
| `anchor_4_pt` | string |  |  |
| `anchor_5_pt` | string |  |  |
| `anchor_1_en` | string |  |  |
| `anchor_2_en` | string |  |  |
| `anchor_3_en` | string |  |  |
| `anchor_4_en` | string |  |  |
| `anchor_5_en` | string |  |  |
| `order` | number |  |  |
| `subsection_pt` | string |  |  |
| `subsection_en` | string |  |  |
| `id` | string |  | Unique record identifier |
| `created_date` | string |  | Record creation timestamp |
| `updated_date` | string |  | Record last update timestamp |
| `created_by_id` | string |  | ID of the user who created the record |
 
### Endpoints
 
### `GET /entities/Question`
List Question records
 
**Parameters:**
- `q` (query): JSON query filter, e.g. {"status":"active"}
- `limit` (query): Maximum number of records to return
- `skip` (query): Number of records to skip (pagination)
- `sort_by` (query): Field name to sort by. Prefix with '-' for descending order, e.g. -created_date
 
```javascript
const records = await base44.entities.Question.list();
```
 
### `POST /entities/Question`
Create a Question record
 
```javascript
const record = await base44.entities.Question.create({
  // your data
});
```
 
### `DELETE /entities/Question`
Delete multiple Question records
 
```javascript
await base44.entities.Question.deleteMany({
  // query filter — WARNING: empty {} deletes ALL records
  pillar_code: "Example pillar_code"
});
```
 
### `POST /entities/Question/bulk`
Bulk create Question records
 
```javascript
const records = await base44.entities.Question.bulkCreate([
  { /* record 1 */ },
  { /* record 2 */ },
]);
```
 
### `PUT /entities/Question/bulk`
Bulk update Question records
 
```javascript
// bulk-update is not available via SDK — use the REST API
```
 
### `PATCH /entities/Question/update-many`
Update many Question records by query
 
```javascript
// update-many is not available via SDK — use the REST API
```
 
### `GET /entities/Question/{Question_id}`
Get a Question record by ID
 
**Parameters:**
- `Question_id` (path): Record ID
 
```javascript
const record = await base44.entities.Question.get(recordId);
```
 
### `PUT /entities/Question/{Question_id}`
Update a Question record
 
**Parameters:**
- `Question_id` (path): Record ID
 
```javascript
const record = await base44.entities.Question.update(recordId, {
  // fields to update
});
```
 
### `DELETE /entities/Question/{Question_id}`
Delete a Question record
 
**Parameters:**
- `Question_id` (path): Record ID
 
```javascript
await base44.entities.Question.delete(recordId);
```
 
### `PUT /entities/Question/{Question_id}/restore`
Restore a deleted Question record
 
**Parameters:**
- `Question_id` (path): Record ID
 
```javascript
const record = await base44.entities.Question.restore(recordId);
```
 
## Report
 
### Schema
 
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `assessment_id` | string | Yes |  |
| `status` | `draft`, `generating`, `review`, `final` |  |  |
| `section_1` | string |  |  |
| `section_2` | string |  |  |
| `section_3` | string |  |  |
| `section_4` | string |  |  |
| `section_5` | string |  |  |
| `section_6` | string |  |  |
| `section_7` | string |  |  |
| `section_8` | string |  |  |
| `section_9` | string |  |  |
| `generated_at` | string |  |  |
| `finalized_at` | string |  |  |
| `language` | `pt`, `en` |  |  |
| `id` | string |  | Unique record identifier |
| `created_date` | string |  | Record creation timestamp |
| `updated_date` | string |  | Record last update timestamp |
| `created_by_id` | string |  | ID of the user who created the record |
 
### Endpoints
 
### `GET /entities/Report`
List Report records
 
**Parameters:**
- `q` (query): JSON query filter, e.g. {"status":"active"}
- `limit` (query): Maximum number of records to return
- `skip` (query): Number of records to skip (pagination)
- `sort_by` (query): Field name to sort by. Prefix with '-' for descending order, e.g. -created_date
 
```javascript
const records = await base44.entities.Report.list();
```
 
### `POST /entities/Report`
Create a Report record
 
```javascript
const record = await base44.entities.Report.create({
  // your data
});
```
 
### `DELETE /entities/Report`
Delete multiple Report records
 
```javascript
await base44.entities.Report.deleteMany({
  // query filter — WARNING: empty {} deletes ALL records
  assessment_id: "Example assessment_id"
});
```
 
### `POST /entities/Report/bulk`
Bulk create Report records
 
```javascript
const records = await base44.entities.Report.bulkCreate([
  { /* record 1 */ },
  { /* record 2 */ },
]);
```
 
### `PUT /entities/Report/bulk`
Bulk update Report records
 
```javascript
// bulk-update is not available via SDK — use the REST API
```
 
### `PATCH /entities/Report/update-many`
Update many Report records by query
 
```javascript
// update-many is not available via SDK — use the REST API
```
 
### `GET /entities/Report/{Report_id}`
Get a Report record by ID
 
**Parameters:**
- `Report_id` (path): Record ID
 
```javascript
const record = await base44.entities.Report.get(recordId);
```
 
### `PUT /entities/Report/{Report_id}`
Update a Report record
 
**Parameters:**
- `Report_id` (path): Record ID
 
```javascript
const record = await base44.entities.Report.update(recordId, {
  // fields to update
});
```
 
### `DELETE /entities/Report/{Report_id}`
Delete a Report record
 
**Parameters:**
- `Report_id` (path): Record ID
 
```javascript
await base44.entities.Report.delete(recordId);
```
 
### `PUT /entities/Report/{Report_id}/restore`
Restore a deleted Report record
 
**Parameters:**
- `Report_id` (path): Record ID
 
```javascript
const record = await base44.entities.Report.restore(recordId);
```
 
## ConsultantNote
 
### Schema
 
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `assessment_id` | string | Yes |  |
| `pillar_code` | string | Yes |  |
| `gap_description` | string |  |  |
| `mitigation` | string |  |  |
| `priority` | `high`, `medium`, `low` |  |  |
| `effort` | `low`, `medium`, `high` |  |  |
| `impact` | `low`, `medium`, `high` |  |  |
| `id` | string |  | Unique record identifier |
| `created_date` | string |  | Record creation timestamp |
| `updated_date` | string |  | Record last update timestamp |
| `created_by_id` | string |  | ID of the user who created the record |
 
### Endpoints
 
### `GET /entities/ConsultantNote`
List ConsultantNote records
 
**Parameters:**
- `q` (query): JSON query filter, e.g. {"status":"active"}
- `limit` (query): Maximum number of records to return
- `skip` (query): Number of records to skip (pagination)
- `sort_by` (query): Field name to sort by. Prefix with '-' for descending order, e.g. -created_date
 
```javascript
const records = await base44.entities.ConsultantNote.list();
```
 
### `POST /entities/ConsultantNote`
Create a ConsultantNote record
 
```javascript
const record = await base44.entities.ConsultantNote.create({
  // your data
});
```
 
### `DELETE /entities/ConsultantNote`
Delete multiple ConsultantNote records
 
```javascript
await base44.entities.ConsultantNote.deleteMany({
  // query filter — WARNING: empty {} deletes ALL records
  assessment_id: "Example assessment_id"
});
```
 
### `POST /entities/ConsultantNote/bulk`
Bulk create ConsultantNote records
 
```javascript
const records = await base44.entities.ConsultantNote.bulkCreate([
  { /* record 1 */ },
  { /* record 2 */ },
]);
```
 
### `PUT /entities/ConsultantNote/bulk`
Bulk update ConsultantNote records
 
```javascript
// bulk-update is not available via SDK — use the REST API
```
 
### `PATCH /entities/ConsultantNote/update-many`
Update many ConsultantNote records by query
 
```javascript
// update-many is not available via SDK — use the REST API
```
 
### `GET /entities/ConsultantNote/{ConsultantNote_id}`
Get a ConsultantNote record by ID
 
**Parameters:**
- `ConsultantNote_id` (path): Record ID
 
```javascript
const record = await base44.entities.ConsultantNote.get(recordId);
```
 
### `PUT /entities/ConsultantNote/{ConsultantNote_id}`
Update a ConsultantNote record
 
**Parameters:**
- `ConsultantNote_id` (path): Record ID
 
```javascript
const record = await base44.entities.ConsultantNote.update(recordId, {
  // fields to update
});
```
 
### `DELETE /entities/ConsultantNote/{ConsultantNote_id}`
Delete a ConsultantNote record
 
**Parameters:**
- `ConsultantNote_id` (path): Record ID
 
```javascript
await base44.entities.ConsultantNote.delete(recordId);
```
 
### `PUT /entities/ConsultantNote/{ConsultantNote_id}/restore`
Restore a deleted ConsultantNote record
 
**Parameters:**
- `ConsultantNote_id` (path): Record ID
 
```javascript
const record = await base44.entities.ConsultantNote.restore(recordId);
```
 
## User
 
### Schema
 
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | Yes | The email of the user |
| `full_name` | string | Yes | The full name of the user |
| `role` | `admin`, `ai_consultant`, `account_manager` | Yes |  |
| `id` | string |  | Unique record identifier |
| `created_date` | string |  | Record creation timestamp |
| `updated_date` | string |  | Record last update timestamp |
| `created_by_id` | string |  | ID of the user who created the record |
 
### Endpoints
 
### `GET /entities/User`
List User records
 
**Parameters:**
- `q` (query): JSON query filter, e.g. {"status":"active"}
- `limit` (query): Maximum number of records to return
- `skip` (query): Number of records to skip (pagination)
- `sort_by` (query): Field name to sort by. Prefix with '-' for descending order, e.g. -created_date
 
```javascript
const records = await base44.entities.User.list();
```
 
### `POST /entities/User`
Create a User record
 
```javascript
const record = await base44.entities.User.create({
  // your data
});
```
 
### `GET /entities/User/{User_id}`
Get a User record by ID
 
**Parameters:**
- `User_id` (path): Record ID
 
```javascript
const record = await base44.entities.User.get(recordId);
```
 
### `PUT /entities/User/{User_id}`
Update a User record
 
**Parameters:**
- `User_id` (path): Record ID
 
```javascript
const record = await base44.entities.User.update(recordId, {
  // fields to update
});
```
 
### `DELETE /entities/User/{User_id}`
Delete a User record
 
**Parameters:**
- `User_id` (path): Record ID
 
```javascript
await base44.entities.User.delete(recordId);
