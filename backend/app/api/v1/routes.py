from flask_restful import Api
from flask import Blueprint
import app.api.v1.real_estate as real_estate
import app.api.v1.propertyimageupload as propertyimageupload
import app.api.v1.superadminaction as superadminaction

v1_bp = Blueprint('apis', __name__)
api_v1 = Api(v1_bp)
url = '/api/v1'

api_v1.add_resource(real_estate.RoleTypeMaster, f'{url}/roltypemaster')
api_v1.add_resource(real_estate.SaveAdminContactDetails, f'{url}/saveadmincontactdetails')
api_v1.add_resource(real_estate.SaveContactDetails, f'{url}/savecontactdetails')
api_v1.add_resource(real_estate.PopulatePropertyType, f'{url}/populatepropertytype')
api_v1.add_resource(real_estate.PopulateOwnerShipType, f'{url}/populateownershiptype')
api_v1.add_resource(real_estate.SaveIndividualPropertyDetails, f'{url}/saveindividualpropertydetails')
api_v1.add_resource(real_estate.PendingApplicationListingAuditor, f'{url}/pendingapplicationlistingauditor')
api_v1.add_resource(real_estate.CompletedApplicationListingAuditor, f'{url}/completedapplicationlistingauditor')
api_v1.add_resource(real_estate.ListingAuditorStatusApproved, f'{url}/listingauditorstatusapproved')
api_v1.add_resource(real_estate.AuthSession, f'{url}/auth/session')
api_v1.add_resource(propertyimageupload.PropertyImageUpload, f'{url}/propertyimageupload')
api_v1.add_resource(propertyimageupload.PropertyManagerCompleted, f'{url}/propertymanagercompleted')
api_v1.add_resource(superadminaction.SuperAdminFinalAction, f'{url}/superadminfinalaction')
