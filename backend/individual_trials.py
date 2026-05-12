import boto3
import pandas as pd
from boto3.dynamodb.conditions import Key
from collections import defaultdict

def get_dynamodb_table(table_name="metrics-table"):
    dynamodb = boto3.resource('dynamodb')
    return dynamodb.Table(table_name)

def scan_all_items(table):
    items = []
    response = table.scan()
    
    while True:
        items.extend(response.get("Items", []))
        
        if "LastEvaluatedKey" not in response:
            break
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
    return items

def calculate_metrics_for_trials(trials):
    """Calculate Rec and LDI metrics for a set of trials"""
    valid_trials = [t for t in trials if t.get('participant_response') and t.get('mst_type') is not None]
    
    if not valid_trials:
        return None

    repeat_trials = [t for t in valid_trials if int(t.get('mst_type')) == 1]
    lure_trials = [t for t in valid_trials if int(t.get('mst_type')) == 3]
    foil_trials = [t for t in valid_trials if int(t.get('mst_type')) == 0]
    
    old_to_repeats = (sum(1 for t in repeat_trials if t.get('participant_response') == 'Old') / len(repeat_trials)) if repeat_trials else 0
    old_to_foils = (sum(1 for t in foil_trials if t.get('participant_response') == 'Old') / len(foil_trials)) if foil_trials else 0
    similar_to_lures = (sum(1 for t in lure_trials if t.get('participant_response') == 'Similar') / len(lure_trials)) if lure_trials else 0
    similar_to_foils = (sum(1 for t in foil_trials if t.get('participant_response') == 'Similar') / len(foil_trials)) if foil_trials else 0

    return {
        'rec': old_to_repeats - old_to_foils,
        'rec_old_to_repeats': old_to_repeats,
        'rec_old_to_foils': old_to_foils,
        'rec_repeat_count': len(repeat_trials),
        'rec_foil_count': len(foil_trials),
        'ldi': similar_to_lures - similar_to_foils,
        'ldi_similar_to_lures': similar_to_lures,
        'ldi_similar_to_foils': similar_to_foils,
        'ldi_lure_count': len(lure_trials),
        'ldi_foil_count': len(foil_trials),
        'total_trials': len(valid_trials)
    }

def visualize_all_user_trials(table_name="metrics-table"):
    """Fetch and display all trials for all users with metrics"""
    dynamodb = boto3.resource('dynamodb')
    table = get_dynamodb_table(table_name)

    print(f"Scanning all items from DynamoDB table: {table_name}...")
    
    try:
        all_items = scan_all_items(table)
        
        if not all_items:
            print("No data found.")
            return
        
        print(f"Found {len(all_items)} total items")
        
        # Group by user and session
        user_sessions = defaultdict(lambda: defaultdict(list))
        for item in all_items:
            user_id = item.get('userId')
            session_trial = item.get('session_trial', '')
            session_id = session_trial.split('#')[0] if session_trial else None
            
            if user_id and session_id:
                user_sessions[user_id][session_id].append(item)

        type_map = {
            0: "Foil (Novel)",
            1: "Repeat (Target)",
            2: "Lure (1st Presentation)",
            3: "Lure (Similar Test)"
        }

        def get_verdict(m_type, resp):
            if m_type == 1:  # Repeat
                return "HIT" if resp == "Old" else "MISS"
            if m_type == 3:  # Lure
                return "CORRECT REJECTION" if resp == "Similar" else "FALSE ALARM (Old/New)"
            if m_type == 0:  # Foil
                return "CORRECT REJECTION" if resp == "New" else "FALSE ALARM (Old/Sim)"
            return "N/A (Encoding)"

        all_trials_data = []
        
        for user_id in sorted(user_sessions.keys()):
            sessions = user_sessions[user_id]
            
            for session_id in sorted(sessions.keys()):
                trials = sessions[session_id]
                metrics = calculate_metrics_for_trials(trials)
                
                # Build trial rows with metrics
                for item in trials:
                    m_type = int(item.get('mst_type', -1)) if item.get('mst_type') is not None else -1
                    resp = item.get('participant_response', '')
                    
                    row = {
                        'userId': user_id,
                        'sessionId': session_id,
                        'session_trial': item.get('session_trial', ''),
                        'trial_id': item.get('trial_id'),
                        'image_id': item.get('image_id', ''),
                        'trial_type': item.get('trial_type', ''),
                        'mst_type': m_type,
                        'trial_category': type_map.get(m_type, 'Unknown'),
                        'lag': item.get('lag'),
                        'lure_bin': item.get('lure_bin'),
                        'participant_response': resp,
                        'correct_resp': item.get('correct_resp'),
                        'correct': item.get('correct'),
                        'reaction_time_ms': item.get('reaction_time_ms'),
                        'timestamp': item.get('timestamp', ''),
                        'participant_age': item.get('participant_age'),
                        'participant_gender': item.get('participant_gender'),
                        'verdict': get_verdict(m_type, resp),
                        'rec': metrics.get('rec') if metrics else None,
                        'rec_old_to_repeats': metrics.get('rec_old_to_repeats') if metrics else None,
                        'rec_old_to_foils': metrics.get('rec_old_to_foils') if metrics else None,
                        'rec_repeat_count': metrics.get('rec_repeat_count') if metrics else None,
                        'rec_foil_count': metrics.get('rec_foil_count') if metrics else None,
                        'ldi': metrics.get('ldi') if metrics else None,
                        'ldi_similar_to_lures': metrics.get('ldi_similar_to_lures') if metrics else None,
                        'ldi_similar_to_foils': metrics.get('ldi_similar_to_foils') if metrics else None,
                        'ldi_lure_count': metrics.get('ldi_lure_count') if metrics else None,
                        'ldi_foil_count': metrics.get('ldi_foil_count') if metrics else None,
                        'total_trials': metrics.get('total_trials') if metrics else None,
                    }
                    
                    all_trials_data.append(row)
        
        # Create DataFrame and sort
        if all_trials_data:
            df = pd.DataFrame(all_trials_data)
            
            # Extract trial number for sorting
            df['trial_num'] = df['session_trial'].str.split('#').str[-1].astype(float, errors='ignore')
            df = df.sort_values(['userId', 'sessionId', 'trial_num'])
            df = df.drop('trial_num', axis=1)
            
            # Set display options
            pd.set_option('display.max_rows', None)
            pd.set_option('display.max_columns', None)
            pd.set_option('display.width', None)
            pd.set_option('display.max_colwidth', None)
            
            print("\n" + "="*200)
            print("COMPLETE TRIAL TABLE - All Users with Metrics")
            print("="*200)
            print(df.to_string(index=False))

            csv_file = "all_users_trials_with_metrics.csv"
            df.to_csv(csv_file, index=False)
            print(f"\n[Success] Full table exported to {csv_file}")

    except Exception as e:
        print(f"Error generating table: {e}")

if __name__ == "__main__":
    visualize_all_user_trials()