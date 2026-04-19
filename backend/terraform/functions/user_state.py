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
        if "queryStringParameters" in event and event["queryStringParameters"]:
            user_id = event["queryStringParameters"].get("userId")
            session_id = event["queryStringParameters"].get("sessionId")
        else:
            user_id = event.get("userId")
            session_id = event.get("sessionId")

        response = state_table.get_item(
            Key={"userId": user_id, "sessionId": session_id}
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