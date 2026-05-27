import simplejson as json
import boto3
import os
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])    

def lambda_handler(event, context):
    try:
        query_params = event.get("queryStringParameters", {}) or {}
        user_id = query_params.get("userId")
        session_id = query_params.get("sessionId")

        if not user_id or not session_id:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Missing userId or sessionId parameters"})
            }

        response = table.query(
            KeyConditionExpression=Key("userId").eq(user_id) & Key("sessionId").eq(session_id)
        )
        items = response.get("Items", [])

        if not items:
            return {
                "statusCode": 404,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "No existing state found for user"})
            }

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(items[0])
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)})
        }