import os
from flask import request, current_app, make_response
from flask_restful import Resource
from sqlalchemy import text
from ...extension import db

def ensure_superadmin_action_table():
    """Ensure the public.SuperAdminFinalAction table exists according to the required schema."""
    # Attempt 1: Exact SQL requested by user with all 3 foreign keys
    try:
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS public.SuperAdminFinalAction (
                ActionId SERIAL PRIMARY KEY,
                ImageId INTEGER,
                contact_id INTEGER NOT NULL,
                indprop_id INTEGER NOT NULL,
                AdminStatus VARCHAR(50) NOT NULL,
                Reason TEXT,
                CONSTRAINT fk_image 
                    FOREIGN KEY (ImageId) 
                    REFERENCES public.PropertyUploadImage (ImageId)
                    ON DELETE CASCADE,
                CONSTRAINT fk_contact 
                    FOREIGN KEY (contact_id) 
                    REFERENCES public.contacts (contact_id)
                    ON DELETE CASCADE,
                CONSTRAINT fk_indprop
                    FOREIGN KEY (indprop_id)
                    REFERENCES public.IndividualPropertyDetails (IndProp_Id)
                    ON DELETE CASCADE
            );
        """))
        db.session.commit()
        return
    except Exception:
        db.session.rollback()

    # Attempt 2: Detect primary key column of public.IndividualPropertyDetails if case or name differs
    prop_pk = 'id'
    try:
        cols_check = db.session.execute(text("SELECT * FROM public.IndividualPropertyDetails LIMIT 1"))
        avail_cols = [c.lower() for c in cols_check.keys()]
        for cand in ['indprop_id', 'ind_prop_id', 'individualpropertyid', 'id', 'property_id', 'propertyid']:
            if cand in avail_cols:
                prop_pk = [c for c in cols_check.keys() if c.lower() == cand][0]
                break
    except Exception:
        db.session.rollback()

    # Create public.SuperAdminFinalAction table with foreign keys
    try:
        create_sql = text(f"""
            CREATE TABLE IF NOT EXISTS public.SuperAdminFinalAction (
                ActionId SERIAL PRIMARY KEY,
                ImageId INTEGER,
                contact_id INTEGER NOT NULL,
                indprop_id INTEGER NOT NULL,
                AdminStatus VARCHAR(50) NOT NULL,
                Reason TEXT,
                CONSTRAINT fk_image 
                    FOREIGN KEY (ImageId) 
                    REFERENCES public.PropertyUploadImage (ImageId) 
                    ON DELETE CASCADE,
                CONSTRAINT fk_contact 
                    FOREIGN KEY (contact_id) 
                    REFERENCES public.contacts (contact_id) 
                    ON DELETE CASCADE
            );
        """)
        db.session.execute(create_sql)
        db.session.commit()

        # Add fk_indprop referencing IndividualPropertyDetails (indprop_id / prop_pk)
        try:
            db.session.execute(text(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'fk_indprop'
                    ) THEN
                        ALTER TABLE public.SuperAdminFinalAction 
                        ADD CONSTRAINT fk_indprop 
                        FOREIGN KEY (indprop_id) 
                        REFERENCES public.IndividualPropertyDetails ({prop_pk}) 
                        ON DELETE CASCADE;
                    END IF;
                EXCEPTION
                    WHEN OTHERS THEN
                        NULL;
                END $$;
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

    except Exception:
        db.session.rollback()
        # Fallback table creation without explicit constraints if tables are being set up
        try:
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS public.SuperAdminFinalAction (
                    ActionId SERIAL PRIMARY KEY,
                    ImageId INTEGER,
                    contact_id INTEGER NOT NULL,
                    indprop_id INTEGER NOT NULL,
                    AdminStatus VARCHAR(50) NOT NULL,
                    Reason TEXT
                );
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

    # 3. Migrate any previous status values to standard AdminStatus values:
    # Manager_Approve -> Whitelisted, Auditor_Approve -> AdminProcess, Reject -> Rejected
    try:
        db.session.execute(text("""
            UPDATE public.SuperAdminFinalAction 
            SET AdminStatus = 'Whitelisted' 
            WHERE AdminStatus IN ('Manager_Approve', 'manager_approve', 'Accepted_By_PropertyManager');
        """))
        db.session.execute(text("""
            UPDATE public.SuperAdminFinalAction 
            SET AdminStatus = 'AdminProcess' 
            WHERE AdminStatus IN ('Auditor_Approve', 'auditor_approve', 'Accepted_By_ListingAuditor');
        """))
        db.session.execute(text("""
            UPDATE public.SuperAdminFinalAction 
            SET AdminStatus = 'Rejected' 
            WHERE AdminStatus IN ('Reject', 'reject', 'Rejected_By_PropertyManager');
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # 4. Ensure AdminStatus column exists on public.IndividualPropertyDetails
    try:
        db.session.execute(text("ALTER TABLE public.IndividualPropertyDetails ADD COLUMN IF NOT EXISTS AdminStatus VARCHAR(50);"))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # 5. Fix any properties where pipeline Status was accidentally set to AdminStatus values
    try:
        db.session.execute(text("""
            UPDATE public.IndividualPropertyDetails 
            SET Status = 'Accepted_By_ListingAuditor' 
            WHERE LOWER(TRIM(COALESCE(Status, ''))) = 'adminprocess';
        """))
        db.session.execute(text("""
            UPDATE public.IndividualPropertyDetails 
            SET Status = 'Accepted_By_PropertyManager' 
            WHERE LOWER(TRIM(COALESCE(Status, ''))) = 'whitelisted';
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # 6. Auto-link ImageId in public.SuperAdminFinalAction from PropertyUploadImage
    try:
        db.session.execute(text("""
            UPDATE public.SuperAdminFinalAction s
            SET ImageId = (
                SELECT pui.ImageId FROM public.PropertyUploadImage pui 
                WHERE (pui.indprop_id IS NOT NULL AND pui.indprop_id = s.indprop_id)
                   OR (pui.contact_id IS NOT NULL AND pui.contact_id = s.contact_id)
                ORDER BY CASE WHEN pui.indprop_id = s.indprop_id THEN 1 ELSE 2 END, pui.ImageId DESC
                LIMIT 1
            )
            WHERE s.ImageId IS NULL;
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

def normalize_row_dict(keys, r):
    row = {}
    for k, v in zip(keys, r):
        val = v.isoformat() if hasattr(v, 'isoformat') else (float(v) if hasattr(v, '__float__') and not isinstance(v, (int, float, bool)) else v)
        k_str = str(k)
        row[k_str] = val
        row[k_str.lower()] = val

    key_mappings = {
        'ActionId': ['actionid', 'action_id'],
        'ImageId': ['imageid', 'image_id'],
        'contact_id': ['contact_id', 'contactid'],
        'indprop_id': ['indprop_id', 'ind_prop_id', 'individualpropertyid', 'property_id', 'id'],
        'AdminStatus': ['adminstatus', 'admin_status'],
        'Reason': ['reason'],
        'Propertyname': ['propertyname', 'property_name', 'name'],
        'Propertytype': ['propertytype', 'property_type'],
        'property_type_name': ['property_type_name', 'propertytypename'],
        'Ownershiptype': ['ownershiptype', 'ownership_type'],
        'ownership_type_name': ['ownership_type_name', 'ownershiptypename'],
        'Propertyaddress': ['propertyaddress', 'property_address', 'address'],
        'Ownershipproof': ['ownershipproof', 'ownership_proof', 'proof'],
        'Status': ['status'],
        'contact_name': ['contact_name', 'contactname', 'name'],
        'contact_mobile': ['contact_mobile', 'contactmobile', 'mobile_number', 'mobile'],
        'FrontExteriorAngle': ['frontexteriorangle', 'front_exterior_angle'],
        'LivingRoomMainHall': ['livingroommainhall', 'living_room_main_hall'],
        'MasterBedroomAngle': ['masterbedroomangle', 'master_bedroom_angle'],
        'KitchenDiningSpace': ['kitchendiningspace', 'kitchen_dining_space'],
        'BalconyWashroomAngle': ['balconywashroomangle', 'balcony_washroom_angle'],
        'NearestMetroStation': ['nearestmetrostation', 'nearest_metro_station'],
        'NearestPoliceStation': ['nearestpolicestation', 'nearest_police_station'],
        'NearestHospital': ['nearesthospital', 'nearest_hospital'],
        'NearestShoppingMarket': ['nearestshoppingmarket', 'nearest_shopping_market'],
    }
    for standard_key, variations in key_mappings.items():
        if standard_key not in row or row[standard_key] is None:
            for var in variations:
                if var in row and row[var] is not None:
                    row[standard_key] = row[var]
                    break
    return row

class SuperAdminFinalAction(Resource):
    def options(self):
        return {}, 200

    def get(self):
        ensure_superadmin_action_table()

        indprop_id = request.args.get('indprop_id', type=int) or request.args.get('property_id', type=int)
        contact_id = request.args.get('contact_id', type=int)
        action_id = request.args.get('action_id', type=int)
        admin_status = request.args.get('AdminStatus') or request.args.get('status')

        prop_pk = 'id'
        try:
            cols_check = db.session.execute(text("SELECT * FROM public.IndividualPropertyDetails LIMIT 1"))
            avail_cols = [c.lower() for c in cols_check.keys()]
            for cand in ['indprop_id', 'ind_prop_id', 'individualpropertyid', 'id', 'property_id', 'propertyid']:
                if cand in avail_cols:
                    prop_pk = [c for c in cols_check.keys() if c.lower() == cand][0]
                    break
        except Exception:
            db.session.rollback()

        try:
            select_fields = f"""
                s.ActionId,
                s.ImageId,
                s.contact_id,
                s.indprop_id,
                s.AdminStatus,
                s.Reason,
                i.Propertyname,
                i.Propertytype,
                i.Ownershiptype,
                i.Propertyaddress,
                i.Ownershipproof,
                i.Status,
                COALESCE(i.Status, 'Submitted') AS current_status,
                c.name AS contact_name,
                c.mobile_number AS contact_mobile,
                pt.PropertyType AS property_type_name,
                ot.OwnerTypeName AS ownership_type_name,
                pui.FrontExteriorAngle,
                pui.LivingRoomMainHall,
                pui.MasterBedroomAngle,
                pui.KitchenDiningSpace,
                pui.BalconyWashroomAngle,
                pui.NearestMetroStation,
                pui.NearestPoliceStation,
                pui.NearestHospital,
                pui.NearestShoppingMarket
            """

            query_str = f"""
                SELECT 
                    {select_fields}
                FROM public.SuperAdminFinalAction s
                LEFT JOIN contacts c ON s.contact_id = c.contact_id
                LEFT JOIN public.IndividualPropertyDetails i ON s.indprop_id = i.{prop_pk}
                LEFT JOIN public.PropertyTypeMaster pt ON i.Propertytype = pt.PropertyId
                LEFT JOIN public.OwnerTypeMaster ot ON i.Ownershiptype = ot.OwnerTypeId
                LEFT JOIN LATERAL (
                    SELECT * FROM public.PropertyUploadImage pui_sub
                    WHERE (s.ImageId IS NOT NULL AND s.ImageId = pui_sub.ImageId)
                       OR (s.indprop_id IS NOT NULL AND pui_sub.indprop_id IS NOT NULL AND s.indprop_id = pui_sub.indprop_id)
                       OR (s.contact_id IS NOT NULL AND s.contact_id = pui_sub.contact_id)
                    ORDER BY 
                       CASE 
                            WHEN s.ImageId IS NOT NULL AND s.ImageId = pui_sub.ImageId THEN 1
                            WHEN s.indprop_id IS NOT NULL AND pui_sub.indprop_id IS NOT NULL AND s.indprop_id = pui_sub.indprop_id THEN 2
                            ELSE 3 
                       END,
                       pui_sub.ImageId DESC
                    LIMIT 1
                ) pui ON true
            """
            conditions = []
            params = {}

            if action_id:
                conditions.append("s.ActionId = :action_id")
                params['action_id'] = action_id
            if indprop_id:
                conditions.append("s.indprop_id = :indprop_id")
                params['indprop_id'] = indprop_id
            if contact_id:
                conditions.append("s.contact_id = :contact_id")
                params['contact_id'] = contact_id
            if admin_status and admin_status.strip().lower() != 'all':
                conditions.append("LOWER(TRIM(s.AdminStatus)) = LOWER(TRIM(:admin_status))")
                params['admin_status'] = admin_status.strip()

            if conditions:
                query_str += " WHERE " + " AND ".join(conditions)

            query_str += " ORDER BY s.ActionId DESC LIMIT 100"

            result = db.session.execute(text(query_str), params)
            keys = result.keys()
            rows = [normalize_row_dict(keys, r) for r in result.fetchall()]

            return {
                'message': 'Superadmin executive actions retrieved successfully',
                'count': len(rows),
                'total_actions': len(rows),
                'actions': rows,
                'final_actions': rows
            }, 200

        except Exception as e:
            db.session.rollback()
            # Fallback simple SELECT on public.SuperAdminFinalAction
            try:
                fb_result = db.session.execute(text("SELECT * FROM public.SuperAdminFinalAction ORDER BY ActionId DESC LIMIT 100"))
                keys = fb_result.keys()
                rows = [normalize_row_dict(keys, r) for r in fb_result.fetchall()]
                return {
                    'count': len(rows),
                    'total_actions': len(rows),
                    'actions': rows,
                    'final_actions': rows
                }, 200
            except Exception as fb_err:
                return {'error': str(fb_err)}, 500

    def post(self):
        ensure_superadmin_action_table()

        data = request.get_json(silent=True) or request.form or request.args or {}

        # 1. Extract indprop_id
        indprop_id = (
            data.get('indprop_id') or 
            data.get('id') or 
            data.get('property_id') or 
            data.get('IndividualPropertyId') or 
            data.get('PropertyId')
        )
        if indprop_id is not None:
            try:
                indprop_id = int(str(indprop_id).strip())
            except (ValueError, TypeError):
                indprop_id = None

        # 2. Extract contact_id
        contact_id = data.get('contact_id')
        if contact_id is not None:
            try:
                contact_id = int(str(contact_id).strip())
            except (ValueError, TypeError):
                contact_id = None

        # 3. Extract ImageId
        image_id = data.get('ImageId') or data.get('image_id') or data.get('Imageid')
        if image_id is not None:
            try:
                image_id = int(str(image_id).strip())
            except (ValueError, TypeError):
                image_id = None

        # 4. Extract action and status
        action_val = str(data.get('action') or '').strip()
        status_val = str(data.get('AdminStatus') or data.get('admin_status') or data.get('status') or '').strip()
        property_name = (data.get('Propertyname') or data.get('property_name') or '').strip() or None
        custom_reason = (data.get('Reason') or data.get('reason') or '').strip() or None

        # 5. Detect PK column of public.IndividualPropertyDetails
        prop_pk = 'id'
        try:
            cols_check = db.session.execute(text("SELECT * FROM public.IndividualPropertyDetails LIMIT 1"))
            avail_cols = [c.lower() for c in cols_check.keys()]
            for cand in ['indprop_id', 'ind_prop_id', 'individualpropertyid', 'id', 'property_id', 'propertyid']:
                if cand in avail_cols:
                    prop_pk = [c for c in cols_check.keys() if c.lower() == cand][0]
                    break
        except Exception:
            db.session.rollback()

        # If contact_id is missing, look it up from IndividualPropertyDetails
        if not contact_id and indprop_id:
            try:
                c_row = db.session.execute(
                    text(f"SELECT contact_id FROM public.IndividualPropertyDetails WHERE {prop_pk} = :indprop_id LIMIT 1"),
                    {'indprop_id': indprop_id}
                ).fetchone()
                if c_row and c_row[0]:
                    contact_id = int(c_row[0])
            except Exception:
                db.session.rollback()

        # If indprop_id is missing, look it up by contact_id and property_name
        if not indprop_id and contact_id:
            try:
                find_sql = text(f"""
                    SELECT {prop_pk} FROM public.IndividualPropertyDetails 
                    WHERE contact_id = :contact_id 
                    ORDER BY {prop_pk} DESC LIMIT 1
                """)
                prop_row = db.session.execute(find_sql, {'contact_id': contact_id}).fetchone()
                if prop_row and prop_row[0]:
                    indprop_id = int(prop_row[0])
            except Exception:
                db.session.rollback()

        if not indprop_id:
            return {
                'error': 'indprop_id (or id) is required to record SuperAdmin executive action.'
            }, 400

        if not contact_id:
            return {
                'error': 'contact_id is required to record SuperAdmin executive action.'
            }, 400

        # Verify contact_id exists in contacts table
        try:
            chk_contact = db.session.execute(
                text("SELECT contact_id FROM public.contacts WHERE contact_id = :contact_id"),
                {'contact_id': contact_id}
            ).fetchone()
            if not chk_contact:
                latest_c = db.session.execute(text("SELECT contact_id FROM public.contacts ORDER BY contact_id DESC LIMIT 1")).fetchone()
                if latest_c:
                    contact_id = int(latest_c[0])
        except Exception:
            db.session.rollback()

        # Lookup ImageId from public.PropertyUploadImage if not provided
        if not image_id:
            try:
                img_row = db.session.execute(
                    text("""
                        SELECT ImageId FROM public.PropertyUploadImage 
                        WHERE indprop_id = :indprop_id 
                        ORDER BY ImageId DESC LIMIT 1
                    """),
                    {'indprop_id': indprop_id}
                ).fetchone()
                if img_row and img_row[0]:
                    image_id = int(img_row[0])
                elif contact_id:
                    img_row2 = db.session.execute(
                        text("""
                            SELECT ImageId FROM public.PropertyUploadImage 
                            WHERE contact_id = :contact_id 
                            ORDER BY ImageId DESC LIMIT 1
                        """),
                        {'contact_id': contact_id}
                    ).fetchone()
                    if img_row2 and img_row2[0]:
                        image_id = int(img_row2[0])
            except Exception:
                db.session.rollback()

        # Validate image_id exists to satisfy foreign key fk_image; if not found, use NULL
        if image_id is not None:
            try:
                chk_img = db.session.execute(
                    text("SELECT ImageId FROM public.PropertyUploadImage WHERE ImageId = :img_id"),
                    {'img_id': image_id}
                ).fetchone()
                if not chk_img:
                    image_id = None
            except Exception:
                db.session.rollback()
                image_id = None

        # 6. Map the 3 executive options:
        # - "✓ Full Verify & Make Live" -> AdminStatus = 'Whitelisted', status = 'Accepted_By_PropertyManager'
        # - "🛡️ Mark Auditor Approved" -> AdminStatus = 'AdminProcess', status = 'Accepted_By_ListingAuditor'
        # - "✕ Decline / Flag Listing"  -> AdminStatus = 'Rejected',     status = 'Rejected_By_PropertyManager'
        action_lower = action_val.lower()
        status_lower = status_val.lower()

        if (
            action_val in ['Whitelisted', 'Manager_Approve'] or
            'whitelisted' in action_lower or
            'manager_approve' in action_lower or
            'accepted_by_propertymanager' in status_lower or
            'whitelisted' in status_lower
        ):
            admin_status_record = 'Whitelisted'
            new_pipeline_status = 'Accepted_By_PropertyManager'
            default_reason = 'Superadmin executive verification: Approved, Whitelisted, and promoted directly to active portfolio.'
        elif (
            action_val in ['AdminProcess', 'Auditor_Approve'] or
            'adminprocess' in action_lower or
            'admin_process' in action_lower or
            'auditor_approve' in action_lower or
            'accepted_by_listingauditor' in status_lower or
            'adminprocess' in status_lower
        ):
            admin_status_record = 'AdminProcess'
            new_pipeline_status = 'Accepted_By_ListingAuditor'
            default_reason = 'Superadmin executive review: Deed verified and marked AdminProcess.'
        elif (
            action_val in ['Rejected', 'Reject'] or
            'reject' in action_lower or
            'decline' in action_lower or
            'rejected' in status_lower
        ):
            admin_status_record = 'Rejected'
            new_pipeline_status = 'Rejected_By_PropertyManager'
            default_reason = 'Superadmin executive review: Listing flagged and Rejected from public display.'
        else:
            admin_status_record = action_val or status_val or 'Whitelisted'
            new_pipeline_status = status_val or 'Accepted_By_PropertyManager'
            default_reason = 'Superadmin executive action recorded.'

        final_reason = custom_reason or default_reason

        try:
            # 7. Insert into public.SuperAdminFinalAction table
            insert_sql = text("""
                INSERT INTO public.SuperAdminFinalAction (
                    ImageId,
                    contact_id,
                    indprop_id,
                    AdminStatus,
                    Reason
                ) VALUES (
                    :image_id,
                    :contact_id,
                    :indprop_id,
                    :admin_status,
                    :reason
                ) RETURNING ActionId;
            """)

            result = db.session.execute(insert_sql, {
                'image_id': image_id,
                'contact_id': contact_id,
                'indprop_id': indprop_id,
                'admin_status': admin_status_record,
                'reason': final_reason
            })
            action_id = result.scalar()
            db.session.commit()

            # 8. Update public.IndividualPropertyDetails status and AdminStatus to match the executive decision
            prop_updated = False
            for col in ['indprop_id', 'ind_prop_id', 'IndividualPropertyId', 'individualpropertyid', 'id', 'PropertyId']:
                try:
                    res = db.session.execute(
                        text(f"UPDATE public.IndividualPropertyDetails SET Status = :status, AdminStatus = :admin_status WHERE {col} = :indprop_id"),
                        {'status': new_pipeline_status, 'admin_status': admin_status_record, 'indprop_id': indprop_id}
                    )
                    if res.rowcount > 0:
                        prop_updated = True
                        break
                except Exception:
                    db.session.rollback()
                    try:
                        res = db.session.execute(
                            text(f"UPDATE public.IndividualPropertyDetails SET Status = :status WHERE {col} = :indprop_id"),
                            {'status': new_pipeline_status, 'indprop_id': indprop_id}
                        )
                        if res.rowcount > 0:
                            prop_updated = True
                            break
                    except Exception:
                        db.session.rollback()

            if not prop_updated and contact_id and property_name:
                try:
                    res = db.session.execute(
                        text("""
                            UPDATE public.IndividualPropertyDetails 
                            SET Status = :status, AdminStatus = :admin_status 
                            WHERE contact_id = :contact_id AND LOWER(TRIM(Propertyname)) = LOWER(TRIM(:prop_name))
                        """),
                        {'status': new_pipeline_status, 'admin_status': admin_status_record, 'contact_id': contact_id, 'prop_name': property_name}
                    )
                    if res.rowcount > 0:
                        prop_updated = True
                except Exception:
                    db.session.rollback()

            if not prop_updated and contact_id:
                try:
                    res = db.session.execute(
                        text("""
                            UPDATE public.IndividualPropertyDetails 
                            SET Status = :status, AdminStatus = :admin_status 
                            WHERE contact_id = :contact_id
                        """),
                        {'status': new_pipeline_status, 'admin_status': admin_status_record, 'contact_id': contact_id}
                    )
                    if res.rowcount > 0:
                        prop_updated = True
                except Exception:
                    db.session.rollback()

            db.session.commit()

            return {
                'message': f'Superadmin executive action recorded: AdminStatus set to "{admin_status_record}"',
                'ActionId': action_id,
                'action_id': action_id,
                'indprop_id': indprop_id,
                'contact_id': contact_id,
                'ImageId': image_id,
                'AdminStatus': admin_status_record,
                'status': new_pipeline_status,
                'pipeline_status': new_pipeline_status,
                'Reason': final_reason,
                'property_updated': prop_updated
            }, 201

        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
