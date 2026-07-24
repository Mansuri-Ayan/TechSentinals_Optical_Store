# Linked Members Feature Implementation Plan

This plan outlines the steps to build the Linked Members feature for both the Customer Detail page and the Payment Step, integrating smoothly with existing architecture.

## User Review Required

- **API Paths**: The requirement mentions `/shopkeeper/customers/...` but the existing backend mounts customer routes under `/customers/` in `routes/customer_router.py`. I will use the existing `/customers/{customer_id}/links` path to follow the "do not create duplicates" rule. Is this acceptable?
- **CustomerDetail Placement**: I propose adding a new "Linked Accounts" section directly at the bottom of the "Info" tab in `pages/admin/CustomerDetail.jsx`. This matches the requirement to place it in the best existing place.
- **PaymentStep Suggestions**: I will modify `LoyaltyCustomerSearch.jsx` to accept a `suggestedCustomers` prop. When there is no `searchTerm`, it will render these suggestions, disappearing naturally once the user starts typing.

## Open Questions
No blockers. If the API path deviation is fine, we can proceed.

## Proposed Changes

### Backend

#### [NEW] `apis/customer/links.py`
Create the links API endpoints:
- `GET /{customer_id}/links`: Returns a list of linked customers (including points and store name).
- `POST /{customer_id}/links`: Accepts either `customer_id_2` to link an existing user or `new_customer` data to create and link. Handles 409 phone conflicts.
- `DELETE /{customer_id}/links/{linked_id}`: Deletes the linkage row. Returns 404 if not found.

#### [MODIFY] `routes/customer_router.py`
Include the new `links.py` router so the endpoints are accessible at `/customers/{customer_id}/links`.

#### [MODIFY] `services/customer_link_service.py`
Add `remove_link(db, admin_id, customer_id, linked_id)` to support the DELETE endpoint. Update `list_linked_customers` to ensure the `store` relation is loaded for the response.

### Frontend

#### [NEW] `src/api/customer/customerLinks.api.js`
Create axios API definitions matching the project pattern:
- `getLinkedMembers(customerId)`
- `linkMember(customerId, payload)`
- `unlinkMember(customerId, linkedId)`

#### [NEW] `src/hooks/useCustomerLinks.js`
Create React Query hooks `useLinkedMembers`, `useCreateLink`, and `useRemoveLink` to handle data fetching and mutations seamlessly.

#### [MODIFY] `src/components/shopkeeper/LoyaltyCustomerSearch.jsx`
- Add `suggestedCustomers` prop.
- When `!searchTerm` and `suggestedCustomers` is provided, display a "Linked Members" section with the style dictated by the prompt inside the dropdown, allowing easy selection.
- Make it disappear immediately when the user starts typing.

#### [MODIFY] `src/components/shopkeeper/PaymentStep.jsx`
- Fetch the `customer`'s linked members using `useLinkedMembers(customer?.id)`.
- Pass this list as `suggestedCustomers` into `LoyaltyCustomerSearch` for the billing account.
- The UI handles the empty state automatically (if 0 links, no suggestions passed/shown).

#### [MODIFY] `src/pages/admin/CustomerDetail.jsx`
- Add a "Linked Members" section below the primary info blocks inside the `info` tab.
- Render the UI grid for linked members as requested.
- Create an inline panel (not a modal) when clicking "[+ Link Person]" with the two tabs: Search Existing and Create New.
- Use `useNavigate` for the `[View]` button to jump to the linked person's detail page.
- Implement the inline confirmation for `[Unlink]`.

## Verification Plan

### Automated Tests
N/A (No new automated test files requested, but I will ensure endpoints compile and frontend builds without warnings).

### Manual Verification
1. I will load the Customer Detail page, add a link, verify it appears in the grid, and ensure "Unlink" works instantly.
2. I will go through the POS flow, reach the Payment Step, and verify the linked members appear when I open the billing account search without typing, and disappear when I start typing.
