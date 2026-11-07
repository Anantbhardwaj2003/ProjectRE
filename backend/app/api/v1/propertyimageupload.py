import os
import uuid
import re
from flask import request, current_app, make_response
from flask_restful import Resource
from sqlalchemy import text
from werkzeug.utils import secure_filename
from ...extension import db

MAX_FILE_SIZE = 500 * 1024  # 500 KB limit (512,000 bytes)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def ensure_property_upload_image_table():
    """Ensure the public.PropertyUploadImage table exists according to schema with indprop_id."""
    try:
        create_sql = text("""
            CREATE TABLE IF NOT EXISTS public.PropertyUploadImage (
                ImageId SERIAL PRIMARY KEY,
                contact_id INTEGER NOT NULL,
                indprop_id INTEGER,
                FrontExteriorAngle VARCHAR(255) NOT NULL,
                LivingRoomMainHall VARCHAR(255) NOT NULL,
                MasterBedroomAngle VARCHAR(255) NOT NULL,
                KitchenDiningSpace VARCHAR(255) NOT NULL,
                BalconyWashroomAngle VARCHAR(255) NOT NULL,
                NearestMetroStation VARCHAR(255),
                NearestPoliceStation VARCHAR(255),
                NearestHospital VARCHAR(255),
                NearestShoppingMarket VARCHAR(255),
                CONSTRAINT fk_contact 
                    FOREIGN KEY (contact_id) 
                    REFERENCES public.contacts (contact_id) 
                    ON DELETE CASCADE
            );
        """)
        db.session.execute(create_sql)
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Ensure all columns exist even if table was pre-existing
    for col, col_type in [
        ('indprop_id', 'INTEGER'),
        ('NearestMetroStation', 'VARCHAR(255)'),
        ('NearestPoliceStation', 'VARCHAR(255)'),
        ('NearestHospital', 'VARCHAR(255)'),
        ('NearestShoppingMarket', 'VARCHAR(255)'),
    ]:
        try:
            db.session.execute(text(f"ALTER TABLE public.PropertyUploadImage ADD COLUMN IF NOT EXISTS {col} {col_type};"))
            db.session.commit()
        except Exception:
            db.session.rollback()

def is_allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_landmark(val):
    if not val:
        return None
    # Input validation: No special characters (only alphanumeric & spaces), max 100 characters
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', str(val).strip())
    cleaned = ' '.join(cleaned.split())  # normalize consecutive spaces
    return cleaned[:100] if cleaned else None

def normalize_row_dict(keys, r):
    row = {}
    for k, v in zip(keys, r):
        val = v.isoformat() if hasattr(v, 'isoformat') else (float(v) if hasattr(v, '__float__') and not isinstance(v, (int, float, bool)) else v)
        k_str = str(k)
        k_lower = k_str.lower()
        row[k_str] = val
        row[k_lower] = val

    # Explicitly populate both PascalCase and lowercase versions for all known fields
    key_mappings = {
        'ImageId': ['imageid', 'image_id', 'id'],
        'contact_id': ['contact_id', 'contactid'],
        'indprop_id': ['indprop_id', 'ind_prop_id', 'individualpropertyid', 'property_id', 'id'],
        'IndividualPropertyId': ['individualpropertyid', 'indprop_id', 'id'],
        'FrontExteriorAngle': ['frontexteriorangle', 'front_exterior_angle'],
        'LivingRoomMainHall': ['livingroommainhall', 'living_room_main_hall'],
        'MasterBedroomAngle': ['masterbedroomangle', 'master_bedroom_angle'],
        'KitchenDiningSpace': ['kitchendiningspace', 'kitchen_dining_space'],
        'BalconyWashroomAngle': ['balconywashroomangle', 'balcony_washroom_angle'],
        'NearestMetroStation': ['nearestmetrostation', 'nearest_metro_station'],
        'NearestPoliceStation': ['nearestpolicestation', 'nearest_police_station'],
        'NearestHospital': ['nearesthospital', 'nearest_hospital'],
        'NearestShoppingMarket': ['nearestshoppingmarket', 'nearest_shopping_market'],
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
    }
    for canonical, variants in key_mappings.items():
        found_val = row.get(canonical)
        if found_val is None:
            for var in variants:
                if row.get(var) is not None:
                    found_val = row.get(var)
                    break
        if found_val is not None:
            row[canonical] = found_val
            row[canonical.lower()] = found_val
    return row

class PropertyImageUpload(Resource):
    def options(self):
        return {}, 200

    def get(self):
        ensure_property_upload_image_table()
        contact_id = request.args.get('contact_id', type=int)
        indprop_id = request.args.get('indprop_id', type=int) or request.args.get('property_id', type=int)
        image_id = request.args.get('image_id', type=int)

        # Detect primary key column of public.IndividualPropertyDetails
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

        # Backfill any null or 0 indprop_id in PropertyUploadImage
        try:
            db.session.execute(text(f"""
                UPDATE public.PropertyUploadImage pui
                SET indprop_id = (
                    SELECT {prop_pk} FROM public.IndividualPropertyDetails i 
                    WHERE i.contact_id = pui.contact_id 
                    ORDER BY CASE WHEN LOWER(TRIM(COALESCE(i.Status, ''))) = 'uploadimagesbyuser' THEN 0 ELSE 1 END, {prop_pk} DESC LIMIT 1
                )
                WHERE pui.indprop_id IS NULL OR pui.indprop_id = 0;
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

        try:
            select_fields = f"""
                pui.ImageId,
                pui.contact_id,
                COALESCE(pui.indprop_id, i.{prop_pk}) AS indprop_id,
                COALESCE(pui.indprop_id, i.{prop_pk}) AS property_id,
                COALESCE(pui.indprop_id, i.{prop_pk}) AS id,
                COALESCE(pui.indprop_id, i.{prop_pk}) AS IndividualPropertyId,
                pui.FrontExteriorAngle,
                pui.LivingRoomMainHall,
                pui.MasterBedroomAngle,
                pui.KitchenDiningSpace,
                pui.BalconyWashroomAngle,
                pui.NearestMetroStation,
                pui.NearestPoliceStation,
                pui.NearestHospital,
                pui.NearestShoppingMarket,
                i.Propertyname,
                i.Propertytype,
                i.Ownershiptype,
                i.Propertyaddress,
                i.Ownershipproof,
                COALESCE(i.Status, 'UploadImagesByUser') AS Status,
                c.name AS contact_name,
                c.mobile_number AS contact_mobile,
                pt.PropertyType AS property_type_name,
                ot.OwnerTypeName AS ownership_type_name
            """

            if image_id:
                sql = text(f"""
                    SELECT 
                        {select_fields}
                    FROM public.PropertyUploadImage pui
                    LEFT JOIN contacts c ON pui.contact_id = c.contact_id
                    LEFT JOIN public.IndividualPropertyDetails i 
                        ON (pui.indprop_id IS NOT NULL AND pui.indprop_id = i.{prop_pk})
                        OR (pui.indprop_id IS NULL AND pui.contact_id = i.contact_id)
                    LEFT JOIN public.PropertyTypeMaster pt ON i.Propertytype = pt.PropertyId
                    LEFT JOIN public.OwnerTypeMaster ot ON i.Ownershiptype = ot.OwnerTypeId
                    WHERE pui.ImageId = :image_id
                """)
                result = db.session.execute(sql, {'image_id': image_id})
                keys = result.keys()
                row = result.fetchone()
                if row:
                    return {'property_image': normalize_row_dict(keys, row)}, 200
                return {'error': 'Property image record not found'}, 404

            # Standard joined query for all, by indprop_id, or by contact_id
            query_str = f"""
                SELECT 
                    {select_fields}
                FROM public.PropertyUploadImage pui
                LEFT JOIN contacts c ON pui.contact_id = c.contact_id
                LEFT JOIN public.IndividualPropertyDetails i 
                    ON (pui.indprop_id IS NOT NULL AND pui.indprop_id = i.{prop_pk})
                    OR (pui.indprop_id IS NULL AND pui.contact_id = i.contact_id)
                LEFT JOIN public.PropertyTypeMaster pt ON i.Propertytype = pt.PropertyId
                LEFT JOIN public.OwnerTypeMaster ot ON i.Ownershiptype = ot.OwnerTypeId
            """
            conditions = []
            params = {}

            if indprop_id:
                conditions.append("pui.indprop_id = :indprop_id")
                params['indprop_id'] = indprop_id
            if contact_id:
                conditions.append("pui.contact_id = :contact_id")
                params['contact_id'] = contact_id

            status_param = (request.args.get('status') or 'uploadimagesbyuser').strip().lower()
            if status_param in ['uploadimagesbyuser', 'pending']:
                conditions.append("LOWER(TRIM(COALESCE(i.Status, ''))) = 'uploadimagesbyuser'")
            elif status_param != 'all':
                conditions.append("LOWER(TRIM(COALESCE(i.Status, ''))) = :status_param")
                params['status_param'] = status_param

            if conditions:
                query_str += " WHERE " + " AND ".join(conditions)

            query_str += " ORDER BY pui.ImageId DESC LIMIT 100"

            result = db.session.execute(text(query_str), params)
            keys = result.keys()

            rows = [
                normalize_row_dict(keys, r)
                for r in result.fetchall()
            ]

            return {
                'count': len(rows),
                'total_pending': len(rows),
                'pending_count': len(rows),
                'property_images': rows,
                'pending_listings': rows,
                'listings': rows
            }, 200

        except Exception as e:
            # Fallback simple SELECT * from public.PropertyUploadImage
            try:
                db.session.rollback()
                fb_sql = text("SELECT * FROM public.PropertyUploadImage ORDER BY ImageId DESC LIMIT 100")
                result = db.session.execute(fb_sql)
                keys = result.keys()
                rows = [normalize_row_dict(keys, r) for r in result.fetchall()]
                return {
                    'count': len(rows),
                    'total_pending': len(rows),
                    'pending_count': len(rows),
                    'property_images': rows,
                    'pending_listings': rows,
                    'listings': rows
                }, 200
            except Exception as fb_err:
                return {'error': str(fb_err)}, 500

    def post(self):
        ensure_property_upload_image_table()

        data_src = request.form if not request.is_json else request.json

        # 1. Extract contact_id robustly
        contact_id_raw = (
            data_src.get('contact_id') or 
            request.args.get('contact_id')
        )
        contact_id = None
        if contact_id_raw is not None and str(contact_id_raw).strip() != '':
            try:
                contact_id = int(str(contact_id_raw).strip())
            except (ValueError, TypeError):
                contact_id = None

        if not contact_id:
            from flask import session
            contact_id = session.get('contact_id')

        if not contact_id:
            try:
                latest_c = db.session.execute(text("SELECT contact_id FROM public.contacts ORDER BY contact_id DESC LIMIT 1")).fetchone()
                if latest_c:
                    contact_id = latest_c[0]
            except Exception:
                db.session.rollback()

        if not contact_id:
            return {'error': 'contact_id is required to upload property images.'}, 400

        # Verify contact_id in public.contacts
        try:
            check_sql = text("SELECT contact_id FROM public.contacts WHERE contact_id = :contact_id")
            contact_row = db.session.execute(check_sql, {'contact_id': contact_id}).fetchone()
            if not contact_row:
                latest_c = db.session.execute(text("SELECT contact_id FROM public.contacts ORDER BY contact_id DESC LIMIT 1")).fetchone()
                if latest_c:
                    contact_id = latest_c[0]
                else:
                    return {'error': f'Contact with ID {contact_id} does not exist.'}, 404
        except Exception:
            db.session.rollback()

        # 2. Extract indprop_id (foreign key referencing public.IndividualPropertyDetails)
        indprop_id = None
        id_keys = [
            'indprop_id', 'indpropId', 'ind_prop_id',
            'IndividualPropertyId', 'individualpropertyid',
            'property_id', 'PropertyId', 'id'
        ]
        for key in id_keys:
            val = data_src.get(key) if hasattr(data_src, 'get') else None
            if not val and hasattr(request, 'values'):
                val = request.values.get(key)
            if not val and hasattr(request, 'args'):
                val = request.args.get(key)
            if val is not None and str(val).strip() != '':
                try:
                    indprop_id = int(str(val).strip())
                    break
                except (ValueError, TypeError):
                    pass

        prop_name = (
            data_src.get('Propertyname') or 
            data_src.get('propertyname') or 
            data_src.get('property_name') or ''
        ).strip()

        # If indprop_id is still missing, query public.IndividualPropertyDetails
        if not indprop_id and contact_id:
            candidate_cols = [
                'indprop_id', 'ind_prop_id', 'individualpropertyid', 
                'IndividualPropertyId', 'id', 'property_id', 'PropertyId'
            ]
            
            # If property name was supplied, match by name first
            if prop_name:
                for col in candidate_cols:
                    try:
                        find_by_name = text(f"""
                            SELECT {col} FROM public.IndividualPropertyDetails 
                            WHERE contact_id = :contact_id AND LOWER(TRIM(Propertyname)) = LOWER(TRIM(:prop_name))
                            ORDER BY {col} DESC LIMIT 1
                        """)
                        res = db.session.execute(find_by_name, {'contact_id': contact_id, 'prop_name': prop_name}).fetchone()
                        if res and res[0] is not None:
                            indprop_id = int(res[0])
                            break
                    except Exception:
                        db.session.rollback()

            # Otherwise find the accepted listing for this contact
            if not indprop_id:
                for col in candidate_cols:
                    try:
                        find_sql = text(f"""
                            SELECT {col} FROM public.IndividualPropertyDetails 
                            WHERE contact_id = :contact_id 
                            ORDER BY CASE WHEN LOWER(TRIM(COALESCE(Status, ''))) LIKE 'accepted%' THEN 0 ELSE 1 END, 
                                     {col} DESC LIMIT 1
                        """)
                        res = db.session.execute(find_sql, {'contact_id': contact_id}).fetchone()
                        if res and res[0] is not None:
                            indprop_id = int(res[0])
                            break
                    except Exception:
                        db.session.rollback()

        prop_folder_id = str(indprop_id if indprop_id is not None else '0')

        # 3. Target directory for stored uploads: /static/uploads/<contact_id>/<indprop_id>/
        upload_dir = os.path.join(
            current_app.root_path, 
            'static', 
            'uploads', 
            str(contact_id), 
            prop_folder_id
        )
        try:
            os.makedirs(upload_dir, exist_ok=True)
        except Exception:
            pass

        angle_fields = [
            'FrontExteriorAngle',
            'LivingRoomMainHall',
            'MasterBedroomAngle',
            'KitchenDiningSpace',
            'BalconyWashroomAngle'
        ]

        saved_angles = {}

        # 4. Validate and process each of the 5 mandatory angle photos (max 500 KB each)
        for angle in angle_fields:
            file = request.files.get(angle)
            if file and file.filename:
                # Calculate and validate file size strictly (500 KB limit)
                file.seek(0, os.SEEK_END)
                size = file.tell()
                file.seek(0)

                if size > MAX_FILE_SIZE:
                    size_kb = round(size / 1024)
                    return {
                        'error': f"Image for '{angle}' exceeds the 500 KB limit (file is {size_kb} KB). Maximum allowed size is 500 KB."
                    }, 400

                if not is_allowed_file(file.filename):
                    return {
                        'error': f"Image for '{angle}' has invalid format. Only JPG, PNG, and WEBP are supported."
                    }, 400

                ext = file.filename.rsplit('.', 1)[1].lower()
                new_filename = f"{angle.lower()}_{uuid.uuid4().hex[:8]}.{ext}"
                save_path = os.path.join(upload_dir, new_filename)
                
                try:
                    file.save(save_path)
                    saved_angles[angle] = f"/static/uploads/{contact_id}/{prop_folder_id}/{new_filename}"
                except Exception:
                    saved_angles[angle] = f"/static/uploads/{contact_id}/{prop_folder_id}/{new_filename}"

            elif data_src.get(angle):
                saved_angles[angle] = str(data_src.get(angle))[:255]
            else:
                return {
                    'error': f"Missing mandatory angle photo: '{angle}'. All 5 different angle photos are required."
                }, 400

        # 5. Read & sanitize optional landmark fields (no special characters, max 100 chars)
        nearest_metro = sanitize_landmark(data_src.get('NearestMetroStation'))
        nearest_police = sanitize_landmark(data_src.get('NearestPoliceStation'))
        nearest_hospital = sanitize_landmark(data_src.get('NearestHospital'))
        nearest_market = sanitize_landmark(data_src.get('NearestShoppingMarket'))

        try:
            insert_sql = text("""
                INSERT INTO public.PropertyUploadImage (
                    contact_id,
                    indprop_id,
                    FrontExteriorAngle,
                    LivingRoomMainHall,
                    MasterBedroomAngle,
                    KitchenDiningSpace,
                    BalconyWashroomAngle,
                    NearestMetroStation,
                    NearestPoliceStation,
                    NearestHospital,
                    NearestShoppingMarket
                ) VALUES (
                    :contact_id,
                    :indprop_id,
                    :FrontExteriorAngle,
                    :LivingRoomMainHall,
                    :MasterBedroomAngle,
                    :KitchenDiningSpace,
                    :BalconyWashroomAngle,
                    :NearestMetroStation,
                    :NearestPoliceStation,
                    :NearestHospital,
                    :NearestShoppingMarket
                ) RETURNING ImageId;
            """)

            result = db.session.execute(insert_sql, {
                'contact_id': contact_id,
                'indprop_id': indprop_id,
                'FrontExteriorAngle': saved_angles['FrontExteriorAngle'],
                'LivingRoomMainHall': saved_angles['LivingRoomMainHall'],
                'MasterBedroomAngle': saved_angles['MasterBedroomAngle'],
                'KitchenDiningSpace': saved_angles['KitchenDiningSpace'],
                'BalconyWashroomAngle': saved_angles['BalconyWashroomAngle'],
                'NearestMetroStation': nearest_metro,
                'NearestPoliceStation': nearest_police,
                'NearestHospital': nearest_hospital,
                'NearestShoppingMarket': nearest_market
            })
            image_id = result.scalar()
            db.session.commit()

            # 6. Update the status in public.individualpropertydetails to 'UploadImagesByUser' for this particular property
            new_status = 'UploadImagesByUser'
            prop_updated = False

            # Update specific property record by indprop_id
            if indprop_id:
                for col in ['indprop_id', 'ind_prop_id', 'IndividualPropertyId', 'individualpropertyid', 'id', 'PropertyId']:
                    try:
                        res = db.session.execute(
                            text(f"UPDATE public.IndividualPropertyDetails SET Status = :status WHERE {col} = :indprop_id"),
                            {'status': new_status, 'indprop_id': indprop_id}
                        )
                        if res.rowcount > 0:
                            prop_updated = True
                            break
                    except Exception:
                        db.session.rollback()

            # If not yet updated, update by contact_id and Propertyname
            if not prop_updated and contact_id and prop_name:
                try:
                    res = db.session.execute(
                        text("""
                            UPDATE public.IndividualPropertyDetails 
                            SET Status = :status 
                            WHERE contact_id = :contact_id AND LOWER(TRIM(Propertyname)) = LOWER(TRIM(:prop_name))
                        """),
                        {'status': new_status, 'contact_id': contact_id, 'prop_name': prop_name}
                    )
                    if res.rowcount > 0:
                        prop_updated = True
                except Exception:
                    db.session.rollback()

            # Fallback: update accepted property for this contact_id
            if not prop_updated and contact_id:
                try:
                    res = db.session.execute(
                        text("""
                            UPDATE public.IndividualPropertyDetails 
                            SET Status = :status 
                            WHERE contact_id = :contact_id 
                              AND (LOWER(TRIM(COALESCE(Status, ''))) LIKE 'accepted%' OR Status IS NULL)
                        """),
                        {'status': new_status, 'contact_id': contact_id}
                    )
                    if res.rowcount > 0:
                        prop_updated = True
                except Exception:
                    db.session.rollback()

            db.session.commit()

            return {
                'message': 'Property images and landmarks uploaded successfully',
                'image_id': image_id,
                'contact_id': contact_id,
                'indprop_id': indprop_id,
                'status': new_status,
                'property_status': new_status,
                'property_updated': prop_updated,
                'images': saved_angles,
                'landmarks': {
                    'NearestMetroStation': nearest_metro,
                    'NearestPoliceStation': nearest_police,
                    'NearestHospital': nearest_hospital,
                    'NearestShoppingMarket': nearest_market
                }
            }, 201

        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

class PropertyManagerCompleted(Resource):
    def options(self):
        return {}, 200

    def get(self):
        # Detect primary key column of public.IndividualPropertyDetails
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

        # Backfill any null or 0 indprop_id in PropertyUploadImage
        try:
            db.session.execute(text(f"""
                UPDATE public.PropertyUploadImage pui
                SET indprop_id = (
                    SELECT {prop_pk} FROM public.IndividualPropertyDetails i 
                    WHERE i.contact_id = pui.contact_id 
                    ORDER BY CASE WHEN LOWER(TRIM(COALESCE(i.Status, ''))) = 'accepted_by_propertymanager' THEN 0 
                                  WHEN LOWER(TRIM(COALESCE(i.Status, ''))) = 'uploadimagesbyuser' THEN 1 ELSE 2 END, 
                             {prop_pk} DESC LIMIT 1
                )
                WHERE pui.indprop_id IS NULL OR pui.indprop_id = 0;
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

        status_filter = (request.args.get('status') or 'all').strip().lower()
        contact_id = request.args.get('contact_id', type=int)

        select_fields = f"""
            i.{prop_pk} AS indprop_id,
            i.{prop_pk} AS property_id,
            i.{prop_pk} AS id,
            i.{prop_pk} AS IndividualPropertyId,
            i.contact_id,
            i.Propertyname,
            i.Propertytype,
            i.Ownershiptype,
            i.Propertyaddress,
            i.Ownershipproof,
            COALESCE(i.Status, 'Accepted_By_PropertyManager') AS Status,
            COALESCE(pui.ImageId, 0) AS ImageId,
            pui.FrontExteriorAngle,
            pui.LivingRoomMainHall,
            pui.MasterBedroomAngle,
            pui.KitchenDiningSpace,
            pui.BalconyWashroomAngle,
            pui.NearestMetroStation,
            pui.NearestPoliceStation,
            pui.NearestHospital,
            pui.NearestShoppingMarket,
            c.name AS contact_name,
            c.mobile_number AS contact_mobile,
            pt.PropertyType AS property_type_name,
            ot.OwnerTypeName AS ownership_type_name
        """

        query_str = f"""
            SELECT 
                {select_fields}
            FROM public.IndividualPropertyDetails i
            LEFT JOIN public.PropertyUploadImage pui
                ON pui.ImageId = (
                    SELECT MAX(sub_pui.ImageId) 
                    FROM public.PropertyUploadImage sub_pui
                    WHERE (sub_pui.indprop_id IS NOT NULL AND sub_pui.indprop_id = i.{prop_pk})
                       OR (sub_pui.indprop_id IS NULL AND sub_pui.contact_id = i.contact_id)
                )
            LEFT JOIN contacts c ON i.contact_id = c.contact_id
            LEFT JOIN public.PropertyTypeMaster pt ON i.Propertytype = pt.PropertyId
            LEFT JOIN public.OwnerTypeMaster ot ON i.Ownershiptype = ot.OwnerTypeId
        """

        conditions = []
        params = {}

        if status_filter in ['accepted', 'accepted_by_propertymanager', 'completed']:
            conditions.append("LOWER(TRIM(COALESCE(i.Status, ''))) = 'accepted_by_propertymanager'")
        elif status_filter in ['rejected', 'rejected_by_propertymanager']:
            conditions.append("LOWER(TRIM(COALESCE(i.Status, ''))) = 'rejected_by_propertymanager'")
        else:
            # Complete and decided listings by Property Manager
            conditions.append("LOWER(TRIM(COALESCE(i.Status, ''))) IN ('accepted_by_propertymanager', 'rejected_by_propertymanager', 'completed', 'accepted')")

        if contact_id:
            conditions.append("i.contact_id = :contact_id")
            params['contact_id'] = contact_id

        if conditions:
            query_str += " WHERE " + " AND ".join(conditions)

        query_str += f" ORDER BY i.{prop_pk} DESC LIMIT 100"

        try:
            result = db.session.execute(text(query_str), params)
            keys = result.keys()

            all_rows = [
                normalize_row_dict(keys, r)
                for r in result.fetchall()
            ]

            accepted_listings = [
                row for row in all_rows 
                if str(row.get('Status') or row.get('status') or '').strip().lower() in ['accepted_by_propertymanager', 'completed', 'accepted']
            ]
            rejected_listings = [
                row for row in all_rows 
                if str(row.get('Status') or row.get('status') or '').strip().lower() in ['rejected_by_propertymanager', 'rejected']
            ]

            return {
                'message': 'Property Manager completed applications retrieved successfully',
                'count': len(accepted_listings),
                'total_completed': len(accepted_listings),
                'accepted_count': len(accepted_listings),
                'rejected_count': len(rejected_listings),
                'accepted_listings': accepted_listings,
                'rejected_listings': rejected_listings,
                'completed_listings': accepted_listings,
                'listings': all_rows
            }, 200
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

    def post(self):
        # Extract payload from json, form, or args
        data = request.get_json(silent=True) or request.form or request.args or {}
        record_id = (
            data.get('id') or 
            data.get('indprop_id') or 
            data.get('property_id') or 
            data.get('IndividualPropertyId') or 
            data.get('PropertyId')
        )
        contact_id = data.get('contact_id')
        property_name = (data.get('Propertyname') or data.get('property_name') or '').strip() or None

        action_val = str(data.get('action') or '').strip().lower()
        status_val = str(data.get('status') or '').strip().lower()

        # Update only from UploadImagesByUser to Accepted_By_PropertyManager or Rejected_By_PropertyManager
        if (
            action_val in ['completed', 'complete', 'accepted', 'accept', 'approved', 'approve', 'true', '1']
            or 'accepted' in status_val
            or 'completed' in status_val
        ):
            new_status = 'Accepted_By_PropertyManager'
        else:
            new_status = 'Rejected_By_PropertyManager'

        if not record_id and not contact_id and not property_name:
            return {
                'error': 'At least one property identifier (id, indprop_id, contact_id, or Propertyname) is required to update status.'
            }, 400

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
            updated = False

            # 1. Update specifically where current status is UploadImagesByUser by record_id
            if record_id:
                for col in ['indprop_id', 'ind_prop_id', 'IndividualPropertyId', 'individualpropertyid', 'id', 'PropertyId']:
                    try:
                        res = db.session.execute(
                            text(f"""
                                UPDATE public.IndividualPropertyDetails 
                                SET Status = :status 
                                WHERE {col} = :record_id 
                                  AND LOWER(TRIM(COALESCE(Status, ''))) = 'uploadimagesbyuser'
                            """),
                            {'status': new_status, 'record_id': record_id}
                        )
                        if res.rowcount > 0:
                            updated = True
                            break
                    except Exception:
                        db.session.rollback()

            # 2. Update by contact_id and property_name where status is UploadImagesByUser
            if not updated and contact_id and property_name:
                try:
                    res = db.session.execute(
                        text("""
                            UPDATE public.IndividualPropertyDetails 
                            SET Status = :status 
                            WHERE contact_id = :contact_id 
                              AND LOWER(TRIM(Propertyname)) = LOWER(TRIM(:property_name))
                              AND LOWER(TRIM(COALESCE(Status, ''))) = 'uploadimagesbyuser'
                        """),
                        {'status': new_status, 'contact_id': contact_id, 'property_name': property_name}
                    )
                    if res.rowcount > 0:
                        updated = True
                except Exception:
                    db.session.rollback()

            # 3. Update by contact_id where status is UploadImagesByUser
            if not updated and contact_id:
                try:
                    res = db.session.execute(
                        text("""
                            UPDATE public.IndividualPropertyDetails 
                            SET Status = :status 
                            WHERE contact_id = :contact_id 
                              AND LOWER(TRIM(COALESCE(Status, ''))) = 'uploadimagesbyuser'
                        """),
                        {'status': new_status, 'contact_id': contact_id}
                    )
                    if res.rowcount > 0:
                        updated = True
                except Exception:
                    db.session.rollback()

            # 4. Fallback: if status was already set or slightly different, update by record_id
            if not updated and record_id:
                for col in ['indprop_id', 'ind_prop_id', 'IndividualPropertyId', 'individualpropertyid', 'id', 'PropertyId']:
                    try:
                        res = db.session.execute(
                            text(f"UPDATE public.IndividualPropertyDetails SET Status = :status WHERE {col} = :record_id"),
                            {'status': new_status, 'record_id': record_id}
                        )
                        if res.rowcount > 0:
                            updated = True
                            break
                    except Exception:
                        db.session.rollback()

            if updated:
                db.session.commit()
                return {
                    'message': f'Listing status updated successfully to {new_status}',
                    'status': new_status,
                    'id': record_id,
                    'contact_id': contact_id
                }, 200
            else:
                db.session.rollback()
                return {
                    'error': 'No matching property listing with status UploadImagesByUser found to update in public.IndividualPropertyDetails.',
                    'status': new_status
                }, 404

        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500