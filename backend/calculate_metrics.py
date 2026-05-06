"""
Calculate Rec and LDI metrics from MST task data in DynamoDB.

Rec (Recollection) = P(responding 'Old' to repeats) - P(responding 'Old' to novel foils)
LDI (Lure Discrimination Index) = P(responding 'Similar' to similar lures) - P(responding 'Similar' to novel foils)
"""

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


# Cache for trial order data to infer mst_type from image_id
_trial_order_cache = {}

def load_trial_orders_from_local():
    """Load all trial order JSON files from local gamified-mst/public/jsOrders."""
    if _trial_order_cache:
        return _trial_order_cache
    
    jsorders_path = os.path.join(os.path.dirname(__file__), "../gamified-mst/public/jsOrders")
    
    if not os.path.exists(jsorders_path):
        print(f"WARNING: jsOrders path not found: {jsorders_path}")
        return {}
    
    try:
        # Load each JSON file and build image->type mapping
        for filename in os.listdir(jsorders_path):
            if not filename.startswith("cMST_") or not filename.endswith(".json"):
                continue
            
            filepath = os.path.join(jsorders_path, filename)
            try:
                with open(filepath, 'r') as f:
                    trials_data = json.load(f)
                
                # Map image -> type for this file
                for trial in trials_data:
                    image_path = trial.get("image", "")
                    # Normalize the image path (e.g., "Set 1_rs/074a.jpg" -> "Set1/074a.jpg")
                    normalized_image = image_path.replace(" ", "").replace("_rs", "")
                    if normalized_image:
                        _trial_order_cache[normalized_image] = trial.get("type")
            except Exception as e:
                print(f"WARNING: Could not load {filename}: {e}")
        
        print(f"Loaded {len(_trial_order_cache)} image->type mappings from local jsOrders")
        return _trial_order_cache
    
    except Exception as e:
        print(f"WARNING: Could not read jsOrders directory: {e}")
        return {}


def infer_mst_type(image_id, trial_data):
    """Infer mst_type from image_id if not present in trial_data."""
    # If mst_type is already set and not None, use it
    if trial_data.get("mst_type") is not None:
        return trial_data.get("mst_type")
    
    # Try to load from cache
    trial_orders = load_trial_orders_from_local()
    if not trial_orders:
        return None
    
    # Try exact match first
    if image_id in trial_orders:
        return trial_orders[image_id]
    
    # Try normalized version (in case of slight path variations)
    normalized = image_id.replace(" ", "").replace("_rs", "")
    if normalized in trial_orders:
        return trial_orders[normalized]
    
    return None


def get_dynamodb_table(table_name):
    """Get DynamoDB table resource."""
    dynamodb = boto3.resource("dynamodb")
    return dynamodb.Table(table_name)


def scan_all_items(table):
    """Scan all items from DynamoDB table with pagination."""
    items = []
    response = table.scan()
    
    while True:
        items.extend(response.get("Items", []))
        
        # Check for pagination
        if "LastEvaluatedKey" not in response:
            break
        
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
    
    return items


def calculate_metrics_for_user(trials):
    """
    Calculate Rec and LDI for a single user's trials.
    
    MST types (based on correct response):
    - Type 1: Repeats (targets) - correct_resp='Old'
    - Type 3: Similar lures - correct_resp='Similar'
    - Type 0, 2: Novel foils - correct_resp='New'
    """
    
    # First, try to infer missing mst_type values from image_id
    for trial in trials:
        if trial.get('mst_type') is None and trial.get('image_id'):
            inferred_type = infer_mst_type(trial.get('image_id'), trial)
            if inferred_type is not None:
                trial['mst_type'] = inferred_type
    
    # Filter valid trials (must have response and mst_type)
    valid_trials = [
        t for t in trials
        if t.get('participant_response') and t.get('mst_type') is not None
    ]
    
    if not valid_trials:
        return None
    
    # Separate trials by type (corrected classification)
    repeat_trials = [t for t in valid_trials if t.get('mst_type') == 1]
    lure_trials = [t for t in valid_trials if t.get('mst_type') == 3]
    novel_trials = [t for t in valid_trials if t.get('mst_type') in [0, 2]]
    
    # Calculate probabilities
    metrics = {}
    
    # Rec calculation
    if repeat_trials:
        old_to_repeats = sum(
            1 for t in repeat_trials if t.get('participant_response') == 'Old'
        ) / len(repeat_trials)
    else:
        old_to_repeats = 0
    
    if novel_trials:
        old_to_novel = sum(
            1 for t in novel_trials if t.get('participant_response') == 'Old'
        ) / len(novel_trials)
    else:
        old_to_novel = 0
    
    metrics['rec'] = old_to_repeats - old_to_novel
    metrics['rec_old_to_repeats'] = old_to_repeats
    metrics['rec_old_to_novel'] = old_to_novel
    metrics['rec_repeat_count'] = len(repeat_trials)
    metrics['rec_novel_count'] = len(novel_trials)
    
    # LDI calculation
    if lure_trials:
        similar_to_lures = sum(
            1 for t in lure_trials if t.get('participant_response') == 'Similar'
        ) / len(lure_trials)
    else:
        similar_to_lures = 0
    
    if novel_trials:
        similar_to_novel = sum(
            1 for t in novel_trials if t.get('participant_response') == 'Similar'
        ) / len(novel_trials)
    else:
        similar_to_novel = 0
    
    metrics['ldi'] = similar_to_lures - similar_to_novel
    metrics['ldi_similar_to_lures'] = similar_to_lures
    metrics['ldi_similar_to_novel'] = similar_to_novel
    metrics['ldi_lure_count'] = len(lure_trials)
    metrics['ldi_novel_count'] = len(novel_trials)
    
    # Additional metrics
    metrics['total_trials'] = len(valid_trials)
    
    return metrics


def main():
    """Main function to calculate metrics for all users."""
    
    # Get environment variables or use defaults
    table_name = os.environ.get("METRICS_TABLE_NAME", "metrics-table")
    
    print(f"Connecting to DynamoDB table: {table_name}")
    
    try:
        table = get_dynamodb_table(table_name)
        
        # Scan all items
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
            session_trial = item.get('session_trial')  # e.g., "test_session#0"
            
            if user_id and session_trial:
                # Extract just the session ID part (before the #)
                session_id = session_trial.split('#')[0]
                user_sessions[user_id][session_id].append(item)
        
        # Calculate metrics for each user/session
        results = {}
        
        for user_id, sessions in user_sessions.items():
            results[user_id] = {}
            
            for session_id, trials in sessions.items():
                metrics = calculate_metrics_for_user(trials)
                if metrics:
                    results[user_id][session_id] = metrics
        
        # Print results
        print("\n" + "="*80)
        print("METRICS RESULTS")
        print("="*80)
        
        for user_id in sorted(results.keys()):
            print(f"\nUser: {user_id}")
            print("-" * 40)
            
            for session_id in sorted(results[user_id].keys()):
                metrics = results[user_id][session_id]
                print(f"  Session: {session_id}")
                print(f"    Rec (Recollection):  {metrics['rec']:.4f}")
                print(f"      P(Old|Repeats): {metrics['rec_old_to_repeats']:.4f} (n={metrics['rec_repeat_count']})")
                print(f"      P(Old|Novel):   {metrics['rec_old_to_novel']:.4f} (n={metrics['rec_novel_count']})")
                print(f"    LDI (Lure Discrimination): {metrics['ldi']:.4f}")
                print(f"      P(Similar|Lures): {metrics['ldi_similar_to_lures']:.4f} (n={metrics['ldi_lure_count']})")
                print(f"      P(Similar|Novel): {metrics['ldi_similar_to_novel']:.4f} (n={metrics['ldi_novel_count']})")
                print(f"    Total trials: {metrics['total_trials']}")
        
        # Save results to JSON file
        output_file = "metrics_results.json"
        with open(output_file, 'w') as f:
            json.dump(results, f, cls=DecimalEncoder, indent=2)
        
        print(f"\n✓ Results saved to {output_file}")
        
        return results
    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    main()
