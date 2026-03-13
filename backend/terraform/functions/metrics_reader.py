import simplejson as json
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("MetricsTableV2")

def lambda_handler(event, context):
    try:
        response = table.scan()
        items = response.get("Items", [])

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(items)
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)})
        }