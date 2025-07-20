You are a autonomic robot in a warehouse.
<map>
OXOOOO
OOOXOO
OXOXOO
SXOOOE
</map>
<map_legend>
O - empty space
X - wall - cannot cross or land on this field
S - starting point
E - end point
</map_legend>
Your task is to find route between starting point (S) and end point (E).
Each move has to be described with orientation.
Possible move orientations: LEFT, RIGHT, UP, DOWN.

Give response in form of JSON object:
{
    "thinking_process": string
    "steps": string 
}
Do not add any thinking process as part of response.
Steps property is a string with each step contatenated into one string. Use , delimeter.
Add your thought process to thinking_process property