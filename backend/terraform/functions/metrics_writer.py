import json
import os
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])


def lambda_handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
    }

    try:
        # Handle API Gateway or direct test
        if "body" in event:
            payload = json.loads(event["body"])
        else:
            payload = event
        
        trials = payload.get('trials', [])

        with table.batch_writer() as batch:
            for body in trials:
                # Map JSON fields to DynamoDB keys
                user_id = body["participant_id"]
                session_trial = body["session_id#trial_number"]

                item = {
                    "userId": user_id,
                    "sessionTrial": session_trial,
                    "trial_id": body.get("trial_id"),
                    "image_id": body.get("image_id"),
                    "trial_type": body.get("trial_type"),
                    "lure_bin": body.get("lure_bin"),
                    "participant_response": body.get("participant_response"),
                    "correct": body.get("correct"),
                    "reaction_time_ms": body.get("reaction_time_ms"),
                    "timestamp": body.get("timestamp")
                }

                batch.put_item(Item=item)

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"message": f"{len(trials)} trials stored successfully"})
        }

    except Exception as e:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"error": str(e)})
        }