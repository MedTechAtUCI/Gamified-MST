import json
import os
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ.get("TABLE_NAME", "metrics-table"))
state_table = dynamodb.Table(os.environ.get("USER_STATE_TABLE", "user-state-table"))


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
        
        # Update user state with current level
        user_id = payload.get("user_id")
        session_id = payload.get("session_id")
        curr_level = payload.get("current_level")
        game_set = payload.get("set")
        week_of_study = payload.get("game_week")

        if user_id and session_id:
            update_expr = "SET current_level = :lvl, week_of_study = :week, game_set = :set"
            expr_values = {
                ":lvl": curr_level,
                ":week": week_of_study,
                ":set": game_set
            }
            
            state_table.update_item(
                Key={"userId": user_id, "sessionId": session_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_values
            )
        
        # Store trial data if included
        trials = payload.get('trials', [])
        if trials and user_id and session_id:
            with table.batch_writer() as batch:
                for idx, trial in enumerate(trials):
                    item = {
                        "userId": user_id,
                        "sessionTrial": f"{session_id}#{idx}",
                        "trial_id": trial.get("trial_id"),
                        "image_id": trial.get("image_id"),
                        "trial_type": trial.get("trial_type"),
                        "participant_response": trial.get("participant_response"),
                        "correct": trial.get("correct"),
                        "reaction_time_ms": trial.get("reaction_time_ms"),
                        "timestamp": trial.get("timestamp")
                    }
                    batch.put_item(Item=item)

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"message": "State updated successfully"})
        }

    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc()
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": error_msg, "type": type(e).__name__})
        }