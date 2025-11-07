The purpose of these tests is to understand how artwork of different mediums can be packed together in boxes. It will be your job to talk with the client to figure out the correct output for the test cases within this directory. You should also learn if mirrors can be packed with artwork of other mediums or if they are always packed separately. If mirrors can be packed with other artwork mediums, create a set of test cases that can be used to verify the packing rules you create and add them in this directory (create a new subdirectory named appropriately, or a couple of subdirectories). Please document the packing logic you learn from the client in this readme as well.

Client feedback summary (2025-11-06):
- Different mediums may NOT be mixed inside the same carton. The blocking/bracing kits are medium-specific, so a carton that starts with a “4-per-box” item cannot take leftover “6-per-box” items.
- Large cartons (13” depth) still follow the same per-medium limits we already use for standard cartons (11” depth). The extra depth is consumed by thicker foam and bracing, so capacities remain 4/6/8 respectively.
- Mirrors always travel alone (8 per carton max) because they require mirror corners and anti-scuff interleave; we therefore did not add mixed-medium mirror scenarios.

We've separated mediums into 3 categories based on how many art pieces of that medium can fit in a single standard sized box:
4 - acoustic panels and canvases (framed or gallery)
6 - paper print and framed art, glazed with acrylic or glass
8 - mirrors

The provided test cases will only check mediums that can be packed 4 per box and 6 per box. Please ask about mirrors and document what you find out.

Instructions:
The Standard folder contains test cases for standard sized art. Each subdirectory is named following this format:

X_4PerBox-Y_6PerBox

where X is the specific quantity of art pieces that can be packed 4 per box, and Y is the specific quantity of art pieces that can be packed 6 per box.
You should first update the input.csv file to replace X and Y in the second column with the appropriate number from the directory name.
Then fill in expectedoutput.json with the correct values for that input. Create a text file in the subdirectory and provide a brief justification for your answer based on what you learn from the client

The Large folder is effectively the same, however the art pieces are 43 x 43 instead meaning they must be packed in Large boxes. Large boxes have a larger width (13 inches instead of 11 for standard boxes). Work through the same steps for each subdirectory/test case in the Large folder.
