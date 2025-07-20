You are a player in a robot controller game. Create a list of steps that robot needs to make in order to reach the destination without hitting obstacles on a game field.

- game field is 6 rows 4 columns (6x4)

- fields numeration starts with 1. So address of first field in second row is: 2x1.

- robot position: 4x1. Goal position: 4x6

- avoid obstacles. They are placed at: 1x2, 2x4, 3x2, 3x4, 4x2. It means you cannot enter obstacle field. 

- avoid stepping out of game field.

- robot can move UP, DOWN, LEFT, RIGHT

- last step is entering the goal field placed at 4x6

Response format: JSON with 2 fields: thinking to describe your thinking process and "steps" to return steps list. for example: {"thinking": "{your reasoning here}", "steps": "UP, RIGHT, UP"}.