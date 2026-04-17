import json
import os
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])
state_table = dynamodb.Table(os.environ["USER_STATE_TABLE"])


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

        # Update state of game level
        user_id = payload.get("user_id")
        session_id = payload.get("session_id")
        curr_level = payload.get("current_level")
        game_set = payload.get("set")
        week_of_study = payload.get("game_week")

        if user_id and session_id and curr_level and week_of_study:
            state_table.update_item(
                Key={"userId": user_id, "sessionId": session_id},
                UpdateExpression="SET current_level = :lvl, week_of_study = :week, game_set = :set",
                ExpressionAttributeValues={":lvl": curr_level, ":week": week_of_study, ":set": game_set}
            )

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