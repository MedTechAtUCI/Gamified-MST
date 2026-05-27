import simplejson as json
import boto3
import os
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
state_table = dynamodb.Table(os.environ["USER_STATE_TABLE"])

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super(DecimalEncoder, self).default(o)


def lambda_handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS, GET"
    }

    try:
        # Pull query string parameters safely
        query_params = event.get("queryStringParameters", {}) or {}
        
        # Catch userId, userid, or user_id
        user_id = query_params.get("userId") or query_params.get("userid") or query_params.get("user_id")
        
        # Catch sessionId, sessionid, or session_id
        session_id = query_params.get("sessionId") or query_params.get("sessionid") or query_params.get("session_id")

        # Fallback to base event properties if API Gateway wrapped it weirdly
        if not user_id:
            user_id = event.get("userId") or event.get("user_id")
        if not session_id:
            session_id = event.get("sessionId") or event.get("session_id")

        game_type = query_params.get("game_type") or event.get("game_type") or "G"

        if session_id and f"#{game_type}" not in str(session_id):
            session_id = f"{session_id}#{game_type}"

        # CRITICAL SANITY CHECK: If keys are missing or literal "undefined" strings, stop immediately!
        if not user_id or not session_id or user_id == "undefined" or session_id == "undefined":
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"error": f"Invalid or missing keys. Received userId={user_id}, sessionId={session_id}"})
            }

        # Query DynamoDB safely
        response = state_table.get_item(
            Key={"userId": str(user_id), "sessionId": str(session_id)}
        )

        if "Item" in response:
            user_state = response["Item"]
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps(user_state, cls=DecimalEncoder)
            }
        
        else:
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({"message": "State not found"})
            }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": str(e)})
        }