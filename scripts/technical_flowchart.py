"""
Generate a flowchart for the OPERATIONS AI technical approach.
Uses matplotlib only (no graphviz). Run: python technical_flowchart.py
Output: technical_flowchart.png in the same directory.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import os

# Figure - slightly larger for bigger text
fig, ax = plt.subplots(1, 1, figsize=(11, 13))
ax.set_xlim(0, 10)
ax.set_ylim(0, 14)
ax.axis('off')

# Colors
bg_input = '#E3F2FD'
bg_gateway = '#BBDEFB'
bg_agent = '#90CAF9'
bg_ml = '#FFE0B2'
bg_output = '#C8E6C9'
border = '#1976D2'
text_color = '#0D47A1'

# Store box bounds for arrow connection: (x, y, w, h)
boxes = {}

def box(ax, key, x, y, w, h, text, facecolor=bg_agent, fontsize=11, subfont=9):
    """Draw box and save bounds. text can be 'Line1\nLine2' for main and sub."""
    p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02",
                       facecolor=facecolor, edgecolor=border, linewidth=1.2)
    ax.add_patch(p)
    lines = text.split('\n')
    if len(lines) == 2:
        ax.text(x + w/2, y + h/2 + 0.08, lines[0], ha='center', va='center', fontsize=fontsize,
                color=text_color, fontweight='normal')
        ax.text(x + w/2, y + h/2 - 0.08, lines[1], ha='center', va='center', fontsize=subfont,
                color=text_color, fontweight='normal')
    else:
        ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=fontsize,
                color=text_color, fontweight='normal')
    boxes[key] = (x, y, w, h)

def arrow(ax, start_xy, end_xy):
    """Draw arrow from start to end (coordinates at box edges)."""
    ax.annotate('', xy=end_xy, xytext=start_xy,
                arrowprops=dict(arrowstyle='->', color=border, lw=2,
                                connectionstyle='arc3,rad=0'))

def bottom_center(key):
    x, y, w, h = boxes[key]
    return (x + w/2, y)
def top_center(key):
    x, y, w, h = boxes[key]
    return (x + w/2, y + h)
def center(key):
    x, y, w, h = boxes[key]
    return (x + w/2, y + h/2)

# Title
ax.text(5, 13.3, 'OPERATIONS AI — Technical Approach', ha='center', fontsize=16, fontweight='bold', color=text_color)

# Row 0: Inputs
box(ax, 'web', 1.5, 11.8, 2.2, 0.7, 'Website\norders', bg_input, 11, 9)
box(ax, 'wa', 6.3, 11.8, 2.2, 0.7, 'WhatsApp\norders', bg_input, 11, 9)

# Input Gateway
box(ax, 'gateway', 4.2, 10.9, 1.6, 0.7, 'Input\nGateway', bg_gateway, 11, 9)
arrow(ax, bottom_center('web'), top_center('gateway'))
arrow(ax, bottom_center('wa'), top_center('gateway'))

# Order Agent
box(ax, 'order_agent', 4.0, 9.7, 2.0, 0.7, 'Order Agent\n(intent, LLM parse)', bg_agent, 11, 9)
arrow(ax, bottom_center('gateway'), top_center('order_agent'))

# Inventory Agent
box(ax, 'inventory', 4.0, 8.5, 2.0, 0.7, 'Inventory Agent\n(check, reserve)', bg_agent, 11, 9)
arrow(ax, bottom_center('order_agent'), top_center('inventory'))

# Order Creation
box(ax, 'order_creation', 4.2, 7.3, 1.6, 0.6, 'Order Creation', bg_agent, 11, 9)
arrow(ax, bottom_center('inventory'), top_center('order_creation'))

# Decision Engine
box(ax, 'decision', 3.8, 6.0, 2.4, 0.7, 'Decision Engine\n(plan tasks, time, deadline)', bg_agent, 11, 9)
arrow(ax, bottom_center('order_creation'), top_center('decision'))

# Workforce + Coordination
box(ax, 'workforce', 3.4, 4.6, 3.2, 0.8, 'Workforce & Coordination\n(assign by role, shift, workload)', bg_agent, 11, 9)
arrow(ax, bottom_center('decision'), top_center('workforce'))

# Delay Risk Predictor (ML)
box(ax, 'risk', 3.6, 3.4, 2.8, 0.6, 'Delay Risk Predictor (ML)', bg_ml, 11, 9)
arrow(ax, bottom_center('workforce'), top_center('risk'))

# Critic + Task Executor
box(ax, 'critic', 3.2, 2.0, 3.6, 0.8, 'Critic Agent → Task Executor\n(validate plan, complete)', bg_agent, 11, 9)
arrow(ax, bottom_center('risk'), top_center('critic'))

# Outputs
box(ax, 'out_dash', 1.2, 0.4, 2.2, 0.6, 'Dashboard\n(KPIs, orders)', bg_output, 11, 9)
box(ax, 'out_assign', 3.9, 0.4, 2.2, 0.6, 'Assignments\n& risk signal', bg_output, 11, 9)
box(ax, 'out_cust', 6.6, 0.4, 2.2, 0.6, 'Customer\nconfirmation', bg_output, 11, 9)
# Arrows from Critic bottom to each output top
arrow(ax, bottom_center('critic'), top_center('out_dash'))
arrow(ax, bottom_center('critic'), top_center('out_assign'))
arrow(ax, bottom_center('critic'), top_center('out_cust'))

plt.tight_layout()
out_path = os.path.join(os.path.dirname(__file__), 'technical_flowchart.png')
plt.savefig(out_path, dpi=150, bbox_inches='tight', facecolor='white')
print('Saved:', out_path)
plt.close()
