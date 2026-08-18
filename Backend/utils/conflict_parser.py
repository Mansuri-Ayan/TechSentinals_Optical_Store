"""Utility to parse PostgreSQL unique constraint violations into field-specific error messages."""
import re


def parse_unique_violation(error: Exception, entity_type: str = "Staff") -> list[dict]:
    """Parse a database IntegrityError to extract the conflicting field.
    
    Returns a list of {field, message} dicts suitable for structured 409 responses.
    Falls back to a generic message if the field cannot be determined.
    """
    error_str = str(error).lower()
    errors = []

    # PostgreSQL unique violation patterns:
    # Key (phone)=(1234567890) already exists
    # Key (email)=(test@example.com) already exists  
    # Key (employee_code)=(EMP-001) already exists
    field_patterns = {
        "phone": f"A {entity_type.lower()} with this phone number already exists",
        "email": f"A {entity_type.lower()} with this email already exists",
        "employee_code": f"A {entity_type.lower()} with this employee code already exists",
    }

    for field, message in field_patterns.items():
        if field in error_str:
            errors.append({"field": field, "message": message})

    if not errors:
        errors.append({
            "field": "unknown",
            "message": f"{entity_type} with this email, phone, or employee code already exists",
        })

    return errors
