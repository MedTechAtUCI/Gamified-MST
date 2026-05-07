import boto3
import pandas as pd
from boto3.dynamodb.conditions import Key

def visualize_user_trials(user_id, table_name="metrics-table"):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)

    print(f"Fetching trials for user: {user_id}...")
    
    try:
        response = table.query(
            KeyConditionExpression=Key('userId').eq(user_id)
        )
        items = response.get('Items', [])
        
        if not items:
            print("No data found.")
            return
        df = pd.DataFrame(items)
        df['mst_type'] = df['mst_type'].apply(lambda x: int(x) if x is not None else -1)
        
        type_map = {
            0: "Foil (Novel)",
            1: "Repeat (Target)",
            2: "Lure (1st Presentation)",
            3: "Lure (Similar Test)"
        }
        df['trial_category'] = df['mst_type'].map(type_map)

        def get_verdict(row):
            m_type = row['mst_type']
            resp = row['participant_response']
            
            if m_type == 1: # Repeat
                return "HIT" if resp == "Old" else "MISS"
            if m_type == 3: # Lure
                return "CORRECT REJECTION" if resp == "Similar" else "FALSE ALARM (Old/New)"
            if m_type == 0: # Foil
                return "CORRECT REJECTION" if resp == "New" else "FALSE ALARM (Old/Sim)"
            return "N/A (Encoding)"

        df['verdict'] = df.apply(get_verdict, axis=1)

        if 'session_trial' in df.columns:
            df['sort_idx'] = df['session_trial'].str.split('#').str[-1].astype(int)
            df = df.sort_values('sort_idx')

        display_columns = [
            'session_trial', 
            'mst_type', 
            'trial_category', 
            'participant_response', 
            'verdict'
        ]
        
        pd.set_option('display.max_rows', None)
        pd.set_option('display.width', 1000)
        
        print("\n--- FULL TRIAL AUDIT ---")
        print(df[display_columns].to_string(index=False))

        filename = f"user_audit_{user_id}.csv"
        df[display_columns].to_csv(filename, index=False)
        print(f"\n[Success] Full audit exported to {filename}")

    except Exception as e:
        print(f"Error generating table: {e}")

if __name__ == "__main__":
    visualize_user_trials("")