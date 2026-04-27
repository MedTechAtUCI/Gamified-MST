import json
import os
import boto3
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ.get("DYNAMO_TABLE", "metrics-table"))
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
        
        # Extract request parameters
        user_id = payload.get("user_id")
        session_id = payload.get("session_id")
        curr_level = payload.get("current_level")
        game_set = payload.get("set")
        week_of_study = payload.get("game_week")
        session_completed = payload.get("session_completed", False)

        # Ensure numeric fields are the correct type
        if curr_level is not None:
            curr_level = int(curr_level)
        if game_set is not None:
            game_set = int(game_set)
        if week_of_study is not None:
            week_of_study = int(week_of_study)

        participant_age = payload.get("participant_age")
        participant_gender = payload.get("participant_gender")
        screen_size = payload.get("screen_size")
        device_type = payload.get("device_type")
        
        # Ensure participant_age is an integer
        if participant_age is not None:
            participant_age = int(participant_age)

        if user_id and session_id:
            # First, fetch current user state to preserve sessions array
            response = state_table.get_item(
                Key={"userId": user_id, "sessionId": session_id}
            )
            
            current_state = response.get("Item", {})
            sessions = current_state.get("sessions", [])
            
            # Build update expression and values
            update_parts = ["current_level = :lvl", "week_of_study = :week", "game_set = :set"]
            expr_values = {
                ":lvl": curr_level,
                ":week": week_of_study,
                ":set": game_set
            }

            # Always update demographics if provided
            if participant_age is not None:
                update_parts.append("participant_age = :age")
                expr_values[":age"] = participant_age

            if participant_gender:
                update_parts.append("participant_gender = :gender")
                expr_values[":gender"] = participant_gender

            if screen_size:
                update_parts.append("screen_size = :screen")
                expr_values[":screen"] = screen_size

            if device_type:
                update_parts.append("device_type = :device")
                expr_values[":device"] = device_type

            # Handle session completion tracking
            if session_completed:
                # Update or create session record
                session_record = {
                    "sessionId": session_id,
                    "set_number": game_set,
                    "completed": True,
                    "current_level": curr_level,
                    "week_of_study": week_of_study
                }
                
                # Check if session already exists in array
                session_exists = False
                for i, sess in enumerate(sessions):
                    if sess.get("sessionId") == session_id:
                        sessions[i] = session_record
                        session_exists = True
                        break
                
                if not session_exists:
                    sessions.append(session_record)
                
                update_parts.append("sessions = :sessions")
                expr_values[":sessions"] = sessions

            state_table.update_item(
                Key={"userId": user_id, "sessionId": session_id},
                UpdateExpression="SET " + ", ".join(update_parts),
                ExpressionAttributeValues=expr_values
            )
        
        # Store trial data if included
        trials = payload.get('trials', [])
        if trials and user_id and session_id:
            with table.batch_writer() as batch:
                for trial in trials:
                    # Normalize image_id: strip CloudFront URL if present
                    image_id = trial.get("image_id", "")
                    if image_id.startswith("http"):
                        # Extract just Set#/filename part (e.g., "Set5/192a.jpg")
                        parts = image_id.split("/")
                        # Find the index of "Set#" part and take from there
                        for i, part in enumerate(parts):
                            if part.startswith("Set"):
                                image_id = "/".join(parts[i:i+2]) if i+1 < len(parts) else part
                                break
                    
                    trial_id = trial.get("trial_id", "")
                    
                    # Ensure numeric fields are properly typed
                    trial_id_int = int(trial_id) if trial_id else 0
                    reaction_time_ms = trial.get("reaction_time_ms")
                    if reaction_time_ms is not None:
                        reaction_time_ms = int(reaction_time_ms)
                    lure_bin = trial.get("lure_bin")
                    if lure_bin is not None:
                        lure_bin = int(lure_bin)
                    
                    # MST-specific fields
                    mst_type = trial.get("mst_type")
                    if mst_type is not None:
                        mst_type = int(mst_type)
                    lag = trial.get("lag")
                    if lag is not None:
                        lag = int(lag)
                    correct_resp = trial.get("correct_resp")
                    if correct_resp is not None:
                        correct_resp = int(correct_resp)
                    
                    item = {
                        "userId": user_id,
                        "session_trial": f"{session_id}#{trial_id}",
                        "trial_id": trial_id_int,
                        "image_id": image_id,
                        "trial_type": trial.get("trial_type"),
                        "mst_type": mst_type,
                        "lag": lag,
                        "lure_bin": lure_bin,
                        "participant_response": trial.get("participant_response"),
                        "correct_resp": correct_resp,
                        "correct": trial.get("correct"),
                        "reaction_time_ms": reaction_time_ms,
                        "timestamp": trial.get("timestamp"),
                        "participant_age": participant_age,
                        "participant_gender": participant_gender,
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