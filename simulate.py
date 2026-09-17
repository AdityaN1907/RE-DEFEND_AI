import json

def run_re_defend_simulation(nodes_filepath, rules_filepath, temp_c, rain_mm_hr):
    with open(nodes_filepath, 'r') as f:
        data = json.load(f)
        # Handle list vs dict structure safely
        raw_nodes = data if isinstance(data, list) else data.get('nodes', [])
        nodes = {n['id']: n for n in raw_nodes}
        
    with open(rules_filepath, 'r') as f:
        rules = json.load(f)

    # 1. Apply primary environmental impact
    p_rules = rules["environmental_thresholds"]["power"]
    t_rules = rules["environmental_thresholds"]["transit"]

    for n_id, node in nodes.items():
        if node['type'] == 'power':
            if temp_c >= p_rules['heat_trip_temp_c'] or rain_mm_hr >= p_rules['rainfall_submersion_trip_mm_hr']:
                node['capacity'] = 0.0
            elif temp_c > p_rules['heat_degradation_start_temp_c']:
                degradation = (temp_c - p_rules['heat_degradation_start_temp_c']) * p_rules['degradation_rate_per_degree']
                node['capacity'] = max(0.0, 100.0 - degradation)

        elif node['type'] == 'transit':
            if rain_mm_hr >= t_rules['rainfall_impassable_mm_hr']:
                node['capacity'] = 0.0
            elif rain_mm_hr >= t_rules['rainfall_minor_delay_mm_hr']:
                node['capacity'] = 100.0 - t_rules['capacity_drop_at_minor']

    # 2. Iteratively cascade failures
    changed = True
    while changed:
        changed = False
        for n_id, node in nodes.items():
            prev_capacity = node['capacity']
            deps = [nodes[dep_id] for dep_id in node.get('dependency_node_ids', []) if dep_id in nodes]
            
            if node['type'] == 'water':
                power_failed = any(d['capacity'] == 0 for d in deps if d['type'] == 'power')
                if power_failed:
                    node['capacity'] = 0.0

            elif node['type'] == 'hospital':
                power_deps = [d for d in deps if d['type'] == 'power']
                transit_deps = [d for d in deps if d['type'] == 'transit']
                
                power_loss = len(power_deps) > 0 and all(d['capacity'] == 0 for d in power_deps)
                transit_loss = len(transit_deps) > 0 and all(d['capacity'] < 25.0 for d in transit_deps)

                cap = 100.0
                if power_loss:
                    cap -= rules["cascading_rules"]["power_loss_impact"]["hospital"]["capacity_drop_on_power_failure"]
                if transit_loss:
                    cap -= rules["cascading_rules"]["transit_loss_impact"]["hospital_access_restriction_pct"]
                
                node['capacity'] = max(0.0, cap)

            if node['capacity'] != prev_capacity:
                changed = True

    return nodes

# Execute scenario run using local relative paths inside hackathon folder
results = run_re_defend_simulation(
    'pune_infrastructure.json', 
    'failure_rules.json', 
    temp_c=32.0, 
    rain_mm_hr=95.0
)

print("\n--- RE-DEFEND AI SIMULATION RESULTS ---")
for n_id, state in results.items():
    print(f"{state['name']} ({state['type'].upper()}): {state['capacity']}% Operational")

# Save results locally to simulation_report.json
with open('simulation_report.json', 'w') as f:
    json.dump(results, f, indent=2)

print("\nSimulation report successfully saved to simulation_report.json!")