# Data Dictionary

The dataset contains 360 synthetic point-to-point network-flow observations. Values are deterministic (`seed=42`) so screenshots, analysis, and demonstrations remain reproducible.

| Field | Type | Unit / values | Meaning |
|---|---|---|---|
| `timestamp` | datetime | ISO 8601 UTC | Time at which the flow was observed |
| `source_id` | text | Node ID | Originating node |
| `source_type` | category | Department, Server, Database, API, Cloud, AI, IoT, Security | Origin node class |
| `source_department` | category | Development, QA, IT, HR, Finance, Operations, Management | Owning department |
| `destination_id` | text | Node ID | Receiving node |
| `destination_type` | category | Same as source type | Destination node class |
| `destination_department` | category | Department | Destination owner |
| `data_volume_mb` | number | MB | Data transferred in the observation interval |
| `transfer_speed_mbps` | number | Mbps | Effective transfer speed |
| `bandwidth_usage_percent` | number | 0–100% | Share of route bandwidth being used |
| `latency_ms` | number | milliseconds | End-to-end route delay |
| `packet_loss_percent` | number | 0–100% | Share of packets not delivered |
| `network_load_percent` | number | 0–100% | Estimated load on the affected infrastructure |
| `active_connections` | integer | connections | Concurrent open connections |
| `response_time_ms` | number | milliseconds | Application-level response time |
| `queue_length` | integer | requests/messages | Items waiting for processing |
| `data_priority` | category | Low, Normal, High, Critical | Delivery priority |
| `data_classification` | category | Public, Internal, Confidential, Restricted | Information sensitivity |
| `access_permission` | category | Open, Employee, Role-Based, Privileged, Denied | Required/observed access level |
| `threat_level` | category | Low, Medium, High, Critical | Security risk classification |
| `connection_status` | category | Connected, Degraded, Failed | Connection health |
| `route_status` | category | Optimal, Congested, Rerouted, Blocked | Routing state |
| `processing_rate` | number | records/second | Effective processing throughput |
| `api_requests` | integer | requests | API operations in the interval |
| `database_queries` | integer | queries | Database operations in the interval |
| `ai_requests` | integer | requests | AI inference/analytics operations |
| `iot_messages` | integer | messages | IoT telemetry messages |
| `anomaly_status` | category | Normal plus nine abnormal labels | Ground-truth demo label |

Abnormal labels include High Latency, Server Overload, Packet Loss, Traffic Spike, Failed Connection, Network Congestion, Suspicious Traffic, API Overload, and Database Overload.
