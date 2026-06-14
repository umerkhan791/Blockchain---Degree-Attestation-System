from validation import *

cgpa = 3.62
percentage = 78
cnic_valid = True

if is_eligible(
        cgpa,
        percentage,
        cnic_valid):

    print("Degree Approved")

else:

    print("Rejected")