import simplejson as json
import boto3
import os
from collections import defaultdict
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super(DecimalEncoder, self).default(o)

def get_dynamodb_table(table_name):
    dynamodb = boto3.resource("dynamodb")
    return dynamodb.Table(table_name)

def scan_all_items(table):
    items = []
    response = table.scan()
    
    while True:
        items.extend(response.get("Items", []))
        
        # Page break
        if "LastEvaluatedKey" not in response:
            break
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
    return items

def calculate_metrics_for_trials(trials):
    # Filter valid trials
    valid_trials = [t for t in trials if t.get('participant_response') and t.get('mst_type') is not None]
    
    if not valid_trials:
        return None

    # 0: Foil (Novel), 1: Repeat (Target), 3: Lure (Similar)
    # 2: First presentation of a lure -- excluded from formula
    repeat_trials = [t for t in valid_trials if int(t.get('mst_type')) == 1]
    lure_trials = [t for t in valid_trials if int(t.get('mst_type')) == 3]
    foil_trials = [t for t in valid_trials if int(t.get('mst_type')) == 0]
    
    # P(Old|Repeats)
    old_to_repeats = (sum(1 for t in repeat_trials if t.get('participant_response') == 'Old') / len(repeat_trials)) if repeat_trials else 0
    
    # P(Old|Foils)
    old_to_foils = (sum(1 for t in foil_trials if t.get('participant_response') == 'Old') / len(foil_trials)) if foil_trials else 0
    
    # P(Similar|Lures)
    similar_to_lures = (sum(1 for t in lure_trials if t.get('participant_response') == 'Similar') / len(lure_trials)) if lure_trials else 0
    
    # P(Similar|Foils)
    similar_to_foils = (sum(1 for t in foil_trials if t.get('participant_response') == 'Similar') / len(foil_trials)) if foil_trials else 0

    metrics = {
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
    
    return metrics

def main():
    table_name = os.environ.get("METRICS_TABLE_NAME", "metrics-table")
    
    print(f"Connecting to DynamoDB table: {table_name}")
    
    try:
        table = get_dynamodb_table(table_name)
        print("Scanning all items from table...")
        all_items = scan_all_items(table)
        
        if not all_items:
            print("No items found in table.")
            return
        
        print(f"Found {len(all_items)} items")
        
        # Group by user and session
        user_sessions = defaultdict(lambda: defaultdict(list))
        for item in all_items:
            user_id = item.get('userId')
            # Session_trial (format: "sessionId#trialId")
            session_trial = item.get('session_trial', '')
            session_id = session_trial.split('#')[0] if session_trial else None
            
            if user_id and session_id:
                user_sessions[user_id][session_id].append(item)

        results = {}
        
        for user_id, sessions in user_sessions.items():
            results[user_id] = {}
            
            for session_id, trials in sessions.items():
                metrics = calculate_metrics_for_trials(trials)
                if metrics:
                    results[user_id][session_id] = metrics
        
        # Print results
        print("\n" + "="*80)
        print("METRICS RESULTS - Rec and LDI by User/Session")
        print("="*80)
        
        for user_id in sorted(results.keys()):
            print(f"\nUser: {user_id}")
            print("-" * 40)
            
            for session_id in sorted(results[user_id].keys()):
                metrics = results[user_id][session_id]
                print(f"  Session: {session_id}")
                print(f"    Rec (Recollection):  {metrics['rec']:.4f}")
                print(f"      P(Old|Repeats): {metrics['rec_old_to_repeats']:.4f} (n={metrics['rec_repeat_count']})")
                print(f"      P(Old|Foils):   {metrics['rec_old_to_foils']:.4f} (n={metrics['rec_foil_count']})")
                print(f"    LDI (Lure Discrimination): {metrics['ldi']:.4f}")
                print(f"      P(Similar|Lures): {metrics['ldi_similar_to_lures']:.4f} (n={metrics['ldi_lure_count']})")
                print(f"      P(Similar|Foils): {metrics['ldi_similar_to_foils']:.4f} (n={metrics['ldi_foil_count']})")
                print(f"    Total trials: {metrics['total_trials']}")

        output_file = "metrics_results.json"
        with open(output_file, 'w') as f:
            json.dump(results, f, cls=DecimalEncoder, indent=2)
        
        print(f"\nResults saved to {output_file}")
        
        return results
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return None


if __name__ == "__main__":
    main()
