import json
import folium

# Load local infrastructure and simulation data
with open('pune_infrastructure.json', 'r') as f:
    infra_data = json.load(f)

with open('simulation_report.json', 'r') as f:
    report_data = json.load(f)

raw_nodes = infra_data if isinstance(infra_data, list) else infra_data.get('nodes', [])
nodes = {node['id']: node for node in raw_nodes}

# Base map centered over Pune
pune_map = folium.Map(
    location=[18.5204, 73.8567], 
    zoom_start=13,
    tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attr='Esri'
)

# 1. Draw dependency lines (Substations -> Dependent Facilities)
for node_id, node in nodes.items():
    # Safely fetch dependency list regardless of key naming
    deps = node.get('dependency_node_ids') or node.get('dependencies') or node.get('dependency_ids') or []
    
    for dep_id in deps:
        if dep_id in nodes:
            dep_node = nodes[dep_id]
            # Red line if dependency is down, Gray if operating
            dep_capacity = report_data.get(dep_id, {}).get('capacity', 100)
            line_color = 'red' if dep_capacity == 0 else 'gray'
            
            folium.PolyLine(
                locations=[[dep_node['lat'], dep_node['lng']], [node['lat'], node['lng']]],
                color=line_color,
                weight=3,
                opacity=0.7,
                dash_array='6, 6',
                tooltip=f"Dependency: {dep_node['name']} → {node['name']}"
            ).add_to(pune_map)

# 2. Add Node Markers
for node_id, status in report_data.items():
    if node_id not in nodes:
        continue
    
    node = nodes[node_id]
    capacity = status['capacity']
    lat, lng = node['lat'], node['lng']
    name = node['name']
    node_type = node['type']

    color = 'green' if capacity == 100 else ('orange' if capacity > 0 else 'red')
    popup_text = f"<b>{name}</b><br>Type: <b>{node_type.upper()}</b><br>Status: <b>{capacity}% Operational</b>"

    folium.CircleMarker(
        location=[lat, lng],
        radius=9,
        popup=folium.Popup(popup_text, max_width=300),
        color=color,
        fill=True,
        fill_color=color,
        fill_opacity=0.9
    ).add_to(pune_map)

# 3. Add Custom Dashboard Legend
legend_html = '''
<div style="position: fixed; bottom: 30px; left: 30px; width: 190px; height: 130px; 
     background-color: white; border:2px solid #555; z-index:9999; font-size:13px;
     padding: 10px; border-radius: 8px; box-shadow: 2px 2px 6px rgba(0,0,0,0.4); font-family: sans-serif;">
     <b>System Risk Status</b><br><br>
     <i style="background: green; width: 12px; height: 12px; display: inline-block; margin-right: 8px; border-radius: 50%;"></i> Operational (100%)<br>
     <i style="background: orange; width: 12px; height: 12px; display: inline-block; margin-right: 8px; border-radius: 50%;"></i> Degraded (>0%)<br>
     <i style="background: red; width: 12px; height: 12px; display: inline-block; margin-right: 8px; border-radius: 50%;"></i> Failed (0%)<br>
     <span style="border-top: 2px dashed red; display: inline-block; width: 18px; margin-top: 8px; margin-right: 5px;"></span> Failure Connection
</div>
'''
pune_map.get_root().html.add_child(folium.Element(legend_html))

# Save output
output_map_path = 'pune_risk_map.html'
pune_map.save(output_map_path)
print(f"[SUCCESS] Advanced dashboard map generated: {output_map_path}")