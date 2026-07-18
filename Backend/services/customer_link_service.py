from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from models.customer_link import CustomerLink
from models.customer import Customer


async def get_or_create_link(
    db: AsyncSession,
    admin_id: int,
    store_id: int,
    from_customer_id: int,
    to_customer_id: int,
) -> CustomerLink | None:
    if from_customer_id == to_customer_id:
        return None

    # Check if from_customer and to_customer exist and belong to the admin
    from_cust = (await db.execute(select(Customer).filter_by(id=from_customer_id, admin_id=admin_id))).scalar_one_or_none()
    to_cust = (await db.execute(select(Customer).filter_by(id=to_customer_id, admin_id=admin_id))).scalar_one_or_none()

    if not from_cust or not to_cust:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both customers not found"
        )

    # Check if link exists (in either direction)
    existing = (await db.execute(
        select(CustomerLink).filter(
            (CustomerLink.admin_id == admin_id) &
            (
                ((CustomerLink.from_customer_id == from_customer_id) & (CustomerLink.to_customer_id == to_customer_id)) |
                ((CustomerLink.from_customer_id == to_customer_id) & (CustomerLink.to_customer_id == from_customer_id))
            )
        )
    )).scalar_one_or_none()

    if existing:
        return existing

    # Create new link
    new_link = CustomerLink(
        admin_id=admin_id,
        store_id=store_id,
        from_customer_id=from_customer_id,
        to_customer_id=to_customer_id
    )
    db.add(new_link)
    await db.flush()
    return new_link


async def list_linked_customers(db: AsyncSession, admin_id: int, customer_id: int) -> list[Customer]:
    # Find all links involving this customer
    links = (await db.execute(
        select(CustomerLink).filter(
            (CustomerLink.admin_id == admin_id) &
            ((CustomerLink.from_customer_id == customer_id) | (CustomerLink.to_customer_id == customer_id))
        )
    )).scalars().all()

    linked_ids = set()
    for link in links:
        if link.from_customer_id != customer_id:
            linked_ids.add(link.from_customer_id)
        if link.to_customer_id != customer_id:
            linked_ids.add(link.to_customer_id)

    if not linked_ids:
        return []

    # Fetch those customers
    return list((await db.execute(select(Customer).filter(Customer.id.in_(linked_ids)))).scalars().all())
