from flask_restful import Api
from flask import Blueprint
import app.api.v1.real_estate as real_estate

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