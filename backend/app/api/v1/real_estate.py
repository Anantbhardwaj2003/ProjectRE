from flask_restful import Resource, reqparse
from flask import session, request, url_for, current_app, make_response
from sqlalchemy import text
from ...extension import db

class RoleTypeMaster(Resource):
    def options(self):
        return {}, 200

    def get(self):
        try:
            query = text("SELECT RoleId, RoleType FROM public.Role")
            result = db.session.execute(query)
            role_types = [{'RoleId': row[0], 'RoleType': row[1]} for row in result.fetchall()]
            return {'role_types': role_types}, 200
        except Exception as e:
            return {'error': str(e)}, 500

class SaveAdminContactDetails(Resource):
    def options(self):
        return {}, 200

    def get(self):
        parser = reqparse.RequestParser()
        parser.add_argument('admin_id', type=int, required=False, location='args')
        parser.add_argument('username', type=str, required=False, location='args')
        parser.add_argument('password', type=str, required=False, location='args')
        args = parser.parse_args()

        admin_id = args.get('admin_id')
        username = args.get('username')
        password = args.get('password')

        try:
            if admin_id:
                query = text("""
                    SELECT a.Adminid, a.Username, a.Role, r.RoleType 
                    FROM public.Adminlogin a 
                    LEFT JOIN public.Role r ON a.Role = r.RoleId 
                    WHERE a.Adminid = :admin_id
                """)
                result = db.session.execute(query, {'admin_id': admin_id}).fetchone()
                if result:
                    return {
                        'admin': {
                            'admin_id': result[0],
                            'username': result[1],
                            'role_id': result[2],
                            'role_type': result[3]
                        }
                    }, 200
                return {'error': 'Admin account not found'}, 404

            elif username and password:
                # Authentication / Login query
                query = text("""
                    SELECT a.Adminid, a.Username, a.Role, r.RoleType 
                    FROM public.Adminlogin a 
                    LEFT JOIN public.Role r ON a.Role = r.RoleId 
                    WHERE a.Username = :username AND a.Password = :password
                """)
                result = db.session.execute(query, {
                    'username': username.strip(),
                    'password': password.strip()
                }).fetchone()
                if result:
                    return {
                        'message': 'Admin login successful',
                        'admin': {
                            'admin_id': result[0],
                            'username': result[1],
                            'role_id': result[2],
                            'role_type': result[3]
                        }
                    }, 200
                return {'error': 'Invalid username or password'}, 401

            elif username:
                # Check if admin username exists
                query = text("""
                    SELECT a.Adminid, a.Username, a.Role, r.RoleType 
                    FROM public.Adminlogin a 
                    LEFT JOIN public.Role r ON a.Role = r.RoleId 
                    WHERE a.Username = :username
                """)
                result = db.session.execute(query, {'username': username.strip()}).fetchone()
                if result:
                    return {
                        'admin': {
                            'admin_id': result[0],
                            'username': result[1],
                            'role_id': result[2],
                            'role_type': result[3]
                        }
                    }, 200
                return {'error': 'Admin username not found'}, 404

            else:
                # List all registered admins
                query = text("""
                    SELECT a.Adminid, a.Username, a.Role, r.RoleType 
                    FROM public.Adminlogin a 
                    LEFT JOIN public.Role r ON a.Role = r.RoleId 
                    ORDER BY a.Adminid DESC
                """)
                result = db.session.execute(query)
                admins = [
                    {
                        'admin_id': row[0],
                        'username': row[1],
                        'role_id': row[2],
                        'role_type': row[3]
                    }
                    for row in result.fetchall()
                ]
                return {'admins': admins}, 200

        except Exception as e:
            return {'error': str(e)}, 500

    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('username', type=str, required=True, help='Username is required')
        parser.add_argument('password', type=str, required=True, help='Password is required')
        parser.add_argument('role', type=int, required=True, help='Role is required')
        args = parser.parse_args()

        username = args['username'].strip()
        password = args['password'].strip()
        role = args['role']

        try:
            # Check for duplicate username
            check_query = text("SELECT Adminid FROM public.Adminlogin WHERE Username = :username")
            existing = db.session.execute(check_query, {'username': username}).fetchone()
            if existing:
                return {'error': 'Username already exists. Please choose a different username.'}, 400

            # Insert into public.Adminlogin
            query = text("""
                INSERT INTO public.Adminlogin (Username, Password, Role) 
                VALUES (:username, :password, :role) 
                RETURNING Adminid
            """)
            result = db.session.execute(query, {
                'username': username,
                'password': password,
                'role': role
            })
            admin_id = result.scalar()
            db.session.commit()

            return {
                'message': 'Admin account created successfully',
                'admin_id': admin_id
            }, 200

        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

class SaveContactDetails(Resource):
    def options(self):
        return {}, 200

    def get(self):
        parser = reqparse.RequestParser()
        parser.add_argument('contact_id', type=int, required=False, location='args')
        parser.add_argument('mobile_number', type=str, required=False, location='args')
        args = parser.parse_args()

        contact_id = args.get('contact_id')
        mobile_number = args.get('mobile_number')

        try:
            if contact_id:
                query = text("SELECT contact_id, name, mobile_number FROM contacts WHERE contact_id = :contact_id")
                result = db.session.execute(query, {'contact_id': contact_id}).fetchone()
                if result:
                    return {
                        'contact_id': result[0],
                        'name': result[1],
                        'mobile_number': result[2],
                        'contact': {
                            'contact_id': result[0],
                            'name': result[1],
                            'mobile_number': result[2]
                        }
                    }, 200
                return {'error': 'Contact not found'}, 404

            elif mobile_number:
                clean_mobile = mobile_number.strip()
                query = text("SELECT contact_id, name, mobile_number FROM contacts WHERE mobile_number = :mobile_number ORDER BY contact_id DESC")
                result = db.session.execute(query, {'mobile_number': clean_mobile}).fetchone()
                if result:
                    c_id = result[0]
                    u_name = result[1]
                    u_mobile = result[2]

                    # Establish server session only (inside the secure HTTP-only 'session' cookie)
                    session['user'] = u_name
                    session['contact_id'] = c_id
                    session['mobile_number'] = u_mobile
                    session['role'] = 'user'
                    session.permanent = True

                    res = make_response({
                        'contact_id': c_id,
                        'name': u_name,
                        'mobile_number': u_mobile,
                        'contact': {
                            'contact_id': c_id,
                            'name': u_name,
                            'mobile_number': u_mobile
                        }
                    }, 200)

                    # Delete any legacy plain-text cookies so only 'session' exists
                    res.delete_cookie('estatesync_user', path='/')
                    res.delete_cookie('estatesync_contact_id', path='/')
                    res.delete_cookie('estatesync_mobile', path='/')
                    res.delete_cookie('estatesync_role', path='/')
                    return res
                return {'error': 'Contact not found'}, 404

            else:
                query = text("SELECT contact_id, name, mobile_number FROM contacts ORDER BY contact_id DESC")
                result = db.session.execute(query)
                contacts = [
                    {'contact_id': row[0], 'name': row[1], 'mobile_number': row[2]}
                    for row in result.fetchall()
                ]
                return {'contacts': contacts}, 200
        except Exception as e:
            return {'error': str(e)}, 500

    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str, required=True, help='Name is required')
        parser.add_argument('mobile_number', type=str, required=True, help='Mobile number is required')
        args = parser.parse_args()

        name = args['name'].strip()
        mobile_number = args['mobile_number'].strip()

        try:
            query = text("INSERT INTO contacts (name, mobile_number) VALUES (:name, :mobile_number) RETURNING contact_id")
            result = db.session.execute(query, {'name': name, 'mobile_number': mobile_number})
            contact_id = result.scalar()
            db.session.commit()

            session['user'] = name
            session['contact_id'] = contact_id
            session['mobile_number'] = mobile_number
            session['role'] = 'user'
            session.permanent = True

            res = make_response({'message': 'Contact details saved successfully', 'contact_id': contact_id}, 200)
            # Delete any legacy plain-text cookies so only 'session' exists
            res.delete_cookie('estatesync_user', path='/')
            res.delete_cookie('estatesync_contact_id', path='/')
            res.delete_cookie('estatesync_mobile', path='/')
            res.delete_cookie('estatesync_role', path='/')
            return res
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

class PopulatePropertyType(Resource):
    def options(self):
        return {}, 200

    def get(self):
        try:
            query = text("SELECT PropertyId, PropertyType FROM public.PropertyTypeMaster")
            result = db.session.execute(query)
            property_types = [{'PropertyId': row[0], 'PropertyType': row[1]} for row in result.fetchall()]
            return {'property_types': property_types}, 200
        except Exception as e:
            return {'error': str(e)}, 500

class PopulateOwnerShipType(Resource):
    def options(self):
        return {}, 200

    def get(self):
        try:
            query = text("SELECT OwnerTypeId, OwnerTypeName FROM public.OwnerTypeMaster")
            result = db.session.execute(query)
            ownership_types = [{'OwnerTypeId': row[0], 'OwnerTypeName': row[1]} for row in result.fetchall()]
            return {'ownership_types': ownership_types}, 200
        except Exception as e:
            return {'error': str(e)}, 500

class SaveIndividualPropertyDetails(Resource):
    def options(self):
        return {}, 200

    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('contact_id', type=int, required=True, help='contact_id is required')
        parser.add_argument('Propertyname', type=str, required=True, help='Propertyname is required')
        parser.add_argument('Propertytype', type=int, required=False)
        parser.add_argument('Ownershiptype', type=int, required=False)
        parser.add_argument('Propertyaddress', type=str, required=False)
        parser.add_argument('Ownershipproof', type=str, required=False)
        parser.add_argument('Status', type=str, required=False)
        args = parser.parse_args()

        contact_id = args['contact_id']
        Propertyname = args['Propertyname'].strip()
        Propertytype = args.get('Propertytype')
        Ownershiptype = args.get('Ownershiptype')
        Propertyaddress = (args.get('Propertyaddress') or '').strip() or None
        Ownershipproof = (args.get('Ownershipproof') or '').strip() or None
        Status = (args.get('Status') or '').strip() or "Submitted"

        try:
            query = text("""
                INSERT INTO public.IndividualPropertyDetails 
                (contact_id, Propertyname, Propertytype, Ownershiptype, Propertyaddress, Ownershipproof, Status) 
                VALUES (:contact_id, :Propertyname, :Propertytype, :Ownershiptype, :Propertyaddress, :Ownershipproof, :Status)
            """)
            db.session.execute(query, {
                'contact_id': contact_id,
                'Propertyname': Propertyname,
                'Propertytype': Propertytype,
                'Ownershiptype': Ownershiptype,
                'Propertyaddress': Propertyaddress,
                'Ownershipproof': Ownershipproof,
                'Status': Status
            })
            db.session.commit()
            return {'message': 'Property details saved successfully'}, 200
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

class PendingApplicationListingAuditor(Resource):
    def options(self):
        return {}, 200

    def get(self):
        contact_id = request.args.get('contact_id', type=int)
        status_filter = (request.args.get('status') or 'Submitted').strip()

        try:
            # Query summary counts across public.IndividualPropertyDetails
            counts_query = text("""
                SELECT 
                    COUNT(*) as total_count,
                    COUNT(CASE WHEN LOWER(TRIM(COALESCE(Status, ''))) IN ('submitted', 'pending', '') OR Status IS NULL THEN 1 END) as pending_count,
                    COUNT(CASE WHEN LOWER(TRIM(COALESCE(Status, ''))) IN ('accepted_by_listingauditor', 'uploadimagesbyuser') THEN 1 END) as accepted_count,
                    COUNT(CASE WHEN LOWER(TRIM(COALESCE(Status, ''))) = 'rejected_by_listingauditor' THEN 1 END) as rejected_count
                FROM public.IndividualPropertyDetails
            """)
            counts_row = db.session.execute(counts_query).fetchone()
            total_count = counts_row[0] if counts_row else 0
            pending_count = counts_row[1] if counts_row else 0
            accepted_count = counts_row[2] if counts_row else 0
            rejected_count = counts_row[3] if counts_row else 0
        except Exception:
            total_count = pending_count = accepted_count = rejected_count = 0

        try:
            # Joined query for full listing audit details with contacts and master type labels
            query_str = """
                SELECT 
                    i.*,
                    c.name AS contact_name,
                    c.mobile_number AS contact_mobile,
                    pt.PropertyType AS property_type_name,
                    ot.OwnerTypeName AS ownership_type_name
                FROM public.IndividualPropertyDetails i
                LEFT JOIN contacts c ON i.contact_id = c.contact_id
                LEFT JOIN public.PropertyTypeMaster pt ON i.Propertytype = pt.PropertyId
                LEFT JOIN public.OwnerTypeMaster ot ON i.Ownershiptype = ot.OwnerTypeId
            """
            conditions = []
            params = {}

            if status_filter.lower() == 'all':
                pass  # Fetch all records
            elif status_filter.lower() in ['accepted', 'accepted_by_listingauditor', 'completed', 'uploadimagesbyuser']:
                conditions.append("LOWER(TRIM(COALESCE(i.Status, ''))) IN (LOWER('Accepted_By_ListingAuditor'), LOWER('UploadImagesByUser'))")
            elif status_filter.lower() in ['rejected', 'rejected_by_listingauditor']:
                conditions.append("LOWER(TRIM(COALESCE(i.Status, ''))) = LOWER('Rejected_By_ListingAuditor')")
            elif status_filter.lower() in ['submitted', 'pending']:
                conditions.append("(LOWER(TRIM(COALESCE(i.Status, ''))) IN ('submitted', 'pending', '') OR i.Status IS NULL)")
            else:
                conditions.append("LOWER(TRIM(COALESCE(i.Status, ''))) = LOWER(:status)")
                params['status'] = status_filter

            if contact_id:
                conditions.append("i.contact_id = :contact_id")
                params['contact_id'] = contact_id

            if conditions:
                query_str += " WHERE " + " AND ".join(conditions)

            query_str += " ORDER BY i.contact_id DESC"

            result = db.session.execute(text(query_str), params)
            keys = result.keys()

            def serialize_val(val):
                if hasattr(val, 'isoformat'):
                    return val.isoformat()
                if hasattr(val, '__float__') and not isinstance(val, (int, float, bool)):
                    return float(val)
                return val

            listings = [
                {k: serialize_val(v) for k, v in zip(keys, row)}
                for row in result.fetchall()
            ]

            return {
                'message': 'Property applications retrieved successfully',
                'status_filter': status_filter,
                'total_pending': pending_count,
                'pending_count': pending_count,
                'accepted_count': accepted_count,
                'rejected_count': rejected_count,
                'total_count': total_count,
                'count': len(listings),
                'pending_listings': listings,
                'listings': listings
            }, 200

        except Exception as e:
            # Fallback direct query on IndividualPropertyDetails
            try:
                fallback_str = "SELECT * FROM public.IndividualPropertyDetails"
                conditions = []
                params = {}

                if status_filter.lower() == 'all':
                    pass
                elif status_filter.lower() in ['accepted', 'accepted_by_listingauditor', 'completed', 'uploadimagesbyuser']:
                    conditions.append("LOWER(TRIM(COALESCE(Status, ''))) IN (LOWER('Accepted_By_ListingAuditor'), LOWER('UploadImagesByUser'))")
                elif status_filter.lower() in ['rejected', 'rejected_by_listingauditor']:
                    conditions.append("LOWER(TRIM(COALESCE(Status, ''))) = LOWER('Rejected_By_ListingAuditor')")
                elif status_filter.lower() in ['submitted', 'pending']:
                    conditions.append("(LOWER(TRIM(COALESCE(Status, ''))) IN ('submitted', 'pending', '') OR Status IS NULL)")
                else:
                    conditions.append("LOWER(TRIM(COALESCE(Status, ''))) = LOWER(:status)")
                    params['status'] = status_filter

                if contact_id:
                    conditions.append("contact_id = :contact_id")
                    params['contact_id'] = contact_id

                if conditions:
                    fallback_str += " WHERE " + " AND ".join(conditions)

                fallback_str += " ORDER BY contact_id DESC"

                result = db.session.execute(text(fallback_str), params)
                keys = result.keys()

                def serialize_val(val):
                    if hasattr(val, 'isoformat'):
                        return val.isoformat()
                    if hasattr(val, '__float__') and not isinstance(val, (int, float, bool)):
                        return float(val)
                    return val

                listings = [
                    {k: serialize_val(v) for k, v in zip(keys, row)}
                    for row in result.fetchall()
                ]

                return {
                    'message': 'Property applications retrieved successfully',
                    'status_filter': status_filter,
                    'total_pending': pending_count or len(listings),
                    'pending_count': pending_count or len(listings),
                    'accepted_count': accepted_count,
                    'rejected_count': rejected_count,
                    'total_count': total_count or len(listings),
                    'count': len(listings),
                    'pending_listings': listings,
                    'listings': listings
                }, 200
            except Exception as fallback_err:
                return {'error': str(fallback_err)}, 500

class CompletedApplicationListingAuditor(Resource):
    def options(self):
        return {}, 200

    def get(self):
        contact_id = request.args.get('contact_id', type=int)
        mobile_number = request.args.get('mobile_number') or request.args.get('mobile')
        owner_name = request.args.get('name') or request.args.get('owner') or request.args.get('username')
        status_filter = (request.args.get('status') or 'all').strip()

        clean_mob = mobile_number.strip() if mobile_number else ''
        digits = ''.join(filter(str.isdigit, clean_mob))[-10:] if clean_mob else ''

        try:
            # Summary counts across public.IndividualPropertyDetails
            counts_query_str = """
                SELECT 
                    COUNT(*) as total_count,
                    COUNT(CASE WHEN LOWER(TRIM(COALESCE(Status, ''))) IN ('submitted', 'pending', '') OR Status IS NULL THEN 1 END) as pending_count,
                    COUNT(CASE WHEN LOWER(TRIM(COALESCE(Status, ''))) IN ('accepted_by_listingauditor', 'accepted_by_listingaudiotr', 'completed', 'uploadimagesbyuser') THEN 1 END) as accepted_count,
                    COUNT(CASE WHEN LOWER(TRIM(COALESCE(Status, ''))) = 'rejected_by_listingauditor' THEN 1 END) as rejected_count
                FROM public.IndividualPropertyDetails
            """
            c_conds = []
            c_params = {}
            if digits:
                c_conds.append("contact_id IN (SELECT contact_id FROM contacts WHERE mobile_number LIKE :mobile_pattern)")
                c_params['mobile_pattern'] = f"%{digits}%"
            elif contact_id:
                c_conds.append("contact_id = :contact_id")
                c_params['contact_id'] = contact_id

            if owner_name:
                c_conds.append("contact_id IN (SELECT contact_id FROM contacts WHERE LOWER(TRIM(name)) = LOWER(TRIM(:owner_name)))")
                c_params['owner_name'] = owner_name.strip()
            if c_conds:
                counts_query_str += f" WHERE ({' OR '.join(c_conds)})"

            counts_row = db.session.execute(text(counts_query_str), c_params).fetchone()
            total_count = counts_row[0] if counts_row else 0
            pending_count = counts_row[1] if counts_row else 0
            accepted_count = counts_row[2] if counts_row else 0
            rejected_count = counts_row[3] if counts_row else 0
        except Exception:
            total_count = pending_count = accepted_count = rejected_count = 0

        try:
            # Query ONLY those applications whose status is Accepted_By_ListingAuditor or Rejected_By_ListingAuditor
            query_str = """
                SELECT 
                    i.*,
                    c.name AS contact_name,
                    c.mobile_number AS contact_mobile,
                    pt.PropertyType AS property_type_name,
                    ot.OwnerTypeName AS ownership_type_name
                FROM public.IndividualPropertyDetails i
                LEFT JOIN contacts c ON i.contact_id = c.contact_id
                LEFT JOIN public.PropertyTypeMaster pt ON i.Propertytype = pt.PropertyId
                LEFT JOIN public.OwnerTypeMaster ot ON i.Ownershiptype = ot.OwnerTypeId
            """
            conditions = []
            params = {}

            if status_filter.lower() in ['accepted', 'accepted_by_listingauditor', 'accepted_by_listingaudiotr', 'completed', 'uploadimagesbyuser']:
                conditions.append("LOWER(TRIM(COALESCE(i.Status, ''))) IN ('accepted_by_listingauditor', 'accepted_by_listingaudiotr', 'completed', 'uploadimagesbyuser')")
            elif status_filter.lower() in ['rejected', 'rejected_by_listingauditor']:
                conditions.append("LOWER(TRIM(COALESCE(i.Status, ''))) = 'rejected_by_listingauditor'")
            else:
                conditions.append("LOWER(TRIM(COALESCE(i.Status, ''))) IN ('accepted_by_listingauditor', 'accepted_by_listingaudiotr', 'completed', 'rejected_by_listingauditor', 'uploadimagesbyuser')")

            owner_conditions = []
            if digits:
                owner_conditions.append("(c.mobile_number LIKE :mobile_pattern OR i.contact_id IN (SELECT contact_id FROM contacts WHERE mobile_number LIKE :mobile_pattern))")
                params['mobile_pattern'] = f"%{digits}%"
            elif contact_id:
                owner_conditions.append("i.contact_id = :contact_id")
                params['contact_id'] = contact_id

            if owner_name:
                owner_conditions.append("(LOWER(TRIM(c.name)) = LOWER(TRIM(:owner_name)) OR i.contact_id IN (SELECT contact_id FROM contacts WHERE LOWER(TRIM(name)) = LOWER(TRIM(:owner_name))))")
                params['owner_name'] = owner_name.strip()

            if owner_conditions:
                conditions.append(f"({' OR '.join(owner_conditions)})")

            if conditions:
                query_str += " WHERE " + " AND ".join(conditions)

            query_str += " ORDER BY i.contact_id DESC"

            result = db.session.execute(text(query_str), params)
            keys = result.keys()

            def serialize_val(val):
                if hasattr(val, 'isoformat'):
                    return val.isoformat()
                if hasattr(val, '__float__') and not isinstance(val, (int, float, bool)):
                    return float(val)
                return val

            listings = [
                {k: serialize_val(v) for k, v in zip(keys, row)}
                for row in result.fetchall()
            ]

            accepted_listings = [
                l for l in listings 
                if str(l.get('Status') or l.get('status') or '').strip().lower() in ['accepted_by_listingauditor', 'accepted_by_listingaudiotr', 'accepted', 'completed']
            ]
            rejected_listings = [
                l for l in listings 
                if str(l.get('Status') or l.get('status') or '').strip().lower() in ['rejected_by_listingauditor', 'rejected']
            ]

            return {
                'message': 'Completed listing applications retrieved successfully',
                'status_filter': status_filter,
                'count': len(listings),
                'total_completed': len(listings),
                'accepted_count': len(accepted_listings),
                'rejected_count': len(rejected_listings),
                'pending_count': pending_count,
                'total_count': total_count,
                'completed_listings': listings,
                'accepted_listings': accepted_listings,
                'rejected_listings': rejected_listings,
                'listings': listings
            }, 200

        except Exception as join_err:
            try:
                # Direct fallback on IndividualPropertyDetails
                fallback_str = "SELECT * FROM public.IndividualPropertyDetails"
                conditions = []
                params = {}

                if status_filter.lower() in ['accepted', 'accepted_by_listingauditor', 'accepted_by_listingaudiotr', 'completed']:
                    conditions.append("LOWER(TRIM(COALESCE(Status, ''))) IN ('accepted_by_listingauditor', 'accepted_by_listingaudiotr', 'completed')")
                elif status_filter.lower() in ['rejected', 'rejected_by_listingauditor']:
                    conditions.append("LOWER(TRIM(COALESCE(Status, ''))) = 'rejected_by_listingauditor'")
                else:
                    conditions.append("LOWER(TRIM(COALESCE(Status, ''))) IN ('accepted_by_listingauditor', 'accepted_by_listingaudiotr', 'completed', 'rejected_by_listingauditor')")

                fb_owner_conds = []
                if digits:
                    fb_owner_conds.append("contact_id IN (SELECT contact_id FROM contacts WHERE mobile_number LIKE :mobile_pattern)")
                    params['mobile_pattern'] = f"%{digits}%"
                elif contact_id:
                    fb_owner_conds.append("contact_id = :contact_id")
                    params['contact_id'] = contact_id

                if owner_name:
                    fb_owner_conds.append("contact_id IN (SELECT contact_id FROM contacts WHERE LOWER(TRIM(name)) = LOWER(TRIM(:owner_name)))")
                    params['owner_name'] = owner_name.strip()

                if fb_owner_conds:
                    conditions.append(f"({' OR '.join(fb_owner_conds)})")

                if conditions:
                    fallback_str += " WHERE " + " AND ".join(conditions)

                fallback_str += " ORDER BY contact_id DESC"

                result = db.session.execute(text(fallback_str), params)
                keys = result.keys()

                def serialize_val(val):
                    if hasattr(val, 'isoformat'):
                        return val.isoformat()
                    if hasattr(val, '__float__') and not isinstance(val, (int, float, bool)):
                        return float(val)
                    return val

                listings = [
                    {k: serialize_val(v) for k, v in zip(keys, row)}
                    for row in result.fetchall()
                ]

                accepted_listings = [
                    l for l in listings 
                    if str(l.get('Status') or l.get('status') or '').strip().lower() in ['accepted_by_listingauditor', 'accepted_by_listingaudiotr', 'accepted', 'completed', 'uploadimagesbyuser']
                ]
                rejected_listings = [
                    l for l in listings 
                    if str(l.get('Status') or l.get('status') or '').strip().lower() in ['rejected_by_listingauditor', 'rejected']
                ]

                return {
                    'message': 'Completed listing applications retrieved successfully',
                    'status_filter': status_filter,
                    'count': len(listings),
                    'total_completed': len(listings),
                    'accepted_count': accepted_count or len(accepted_listings),
                    'rejected_count': rejected_count or len(rejected_listings),
                    'pending_count': pending_count,
                    'total_count': total_count,
                    'completed_listings': listings,
                    'accepted_listings': accepted_listings,
                    'rejected_listings': rejected_listings,
                    'listings': listings
                }, 200
            except Exception as fallback_err:
                return {'error': str(fallback_err)}, 500

class ListingAuditorStatusApproved(Resource):
    def options(self):
        return {}, 200

    def get(self):
        # Delegate to CompletedApplicationListingAuditor for listing retrieval
        return CompletedApplicationListingAuditor().get()

    def post(self):
        # Extract payload from json, form, or args
        data = request.get_json(silent=True) or request.form or request.args or {}
        record_id = data.get('id') or data.get('property_id') or data.get('PropertyId')
        contact_id = data.get('contact_id')
        property_name = (data.get('Propertyname') or data.get('property_name') or '').strip() or None

        action_val = str(data.get('action') or '').strip().lower()
        status_val = str(data.get('status') or '').strip().lower()
        is_accepted = data.get('is_accepted')

        # When ListingAuditor Accepted the Listing then Status is Changed to Accepted_By_ListingAuditor
        # Otherwise Status should be Rejected_By_ListingAuditor
        if (
            action_val in ['accepted', 'accept', 'completed', 'complete', 'approved', 'approve', 'true', '1']
            or 'accepted' in status_val
            or is_accepted is True
        ):
            new_status = 'Accepted_By_ListingAuditor'
        else:
            new_status = 'Rejected_By_ListingAuditor'

        if not record_id and not contact_id and not property_name:
            return {
                'error': 'At least one property identifier (id, contact_id, or Propertyname) is required to update status.'
            }, 400

        try:
            updated = False

            # 1. Update by contact_id and Propertyname (most accurate)
            if contact_id and property_name:
                sql = text("""
                    UPDATE public.IndividualPropertyDetails 
                    SET Status = :status 
                    WHERE contact_id = :contact_id AND LOWER(TRIM(Propertyname)) = LOWER(TRIM(:property_name))
                """)
                res = db.session.execute(sql, {
                    'status': new_status,
                    'contact_id': contact_id,
                    'property_name': property_name
                })
                if res.rowcount > 0:
                    updated = True

            # 2. Update by contact_id only
            if not updated and contact_id:
                sql = text("UPDATE public.IndividualPropertyDetails SET Status = :status WHERE contact_id = :contact_id")
                res = db.session.execute(sql, {'status': new_status, 'contact_id': contact_id})
                if res.rowcount > 0:
                    updated = True

            # 3. Update by Propertyname only
            if not updated and property_name:
                sql = text("UPDATE public.IndividualPropertyDetails SET Status = :status WHERE LOWER(TRIM(Propertyname)) = LOWER(TRIM(:property_name))")
                res = db.session.execute(sql, {'status': new_status, 'property_name': property_name})
                if res.rowcount > 0:
                    updated = True

            # 4. Update by record id if present
            if not updated and record_id:
                try:
                    sql = text("UPDATE public.IndividualPropertyDetails SET Status = :status WHERE id = :record_id")
                    res = db.session.execute(sql, {'status': new_status, 'record_id': record_id})
                    if res.rowcount > 0:
                        updated = True
                except Exception:
                    db.session.rollback()

            if updated:
                db.session.commit()
                return {
                    'message': f'Listing status updated successfully to {new_status}',
                    'status': new_status
                }, 200
            else:
                db.session.rollback()
                return {
                    'error': 'No matching property listing record found to update in public.IndividualPropertyDetails.',
                    'status': new_status
                }, 404

        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

class AuthSession(Resource):
    def options(self):
        return {}, 200

    def get(self):
        # Read strictly from the secure, HttpOnly Flask session cookie
        user = session.get('user')
        contact_id = session.get('contact_id')
        mobile = session.get('mobile_number')
        role = session.get('role')

        if user:
            return {
                'authenticated': True,
                'user': user,
                'contact_id': contact_id,
                'mobile_number': mobile,
                'role': role or 'user'
            }, 200

        return {'authenticated': False, 'user': None}, 200

    def post(self):
        data = request.get_json(silent=True) or request.form or {}
        user = data.get('name') or data.get('user')
        contact_id = data.get('contact_id')
        mobile = data.get('mobile_number') or data.get('mobile')
        role = data.get('role') or 'user'

        if not user and not mobile:
            return {'error': 'User name or mobile is required'}, 400

        # Store user auth session exclusively in the cryptographically signed Flask session cookie
        session['user'] = user
        session['contact_id'] = contact_id
        session['mobile_number'] = mobile
        session['role'] = role
        session.permanent = True

        res = make_response({
            'message': 'Session established successfully in secure session cookie',
            'authenticated': True,
            'user': user,
            'contact_id': contact_id,
            'mobile_number': mobile,
            'role': role
        }, 200)

        # Ensure no plain-text custom cookies are set, and delete any legacy ones
        res.delete_cookie('estatesync_user', path='/')
        res.delete_cookie('estatesync_role', path='/')
        res.delete_cookie('estatesync_contact_id', path='/')
        res.delete_cookie('estatesync_mobile', path='/')

        return res

    def delete(self):
        session.clear()
        res = make_response({'message': 'Logged out successfully', 'authenticated': False}, 200)
        res.delete_cookie('estatesync_user', path='/')
        res.delete_cookie('estatesync_role', path='/')
        res.delete_cookie('estatesync_contact_id', path='/')
        res.delete_cookie('estatesync_mobile', path='/')
        return res
