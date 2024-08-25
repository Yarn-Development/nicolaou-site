from decimal import Decimal
import random

def dec(decimal_place):
    num = round(random.uniform(1,100), decimal_place)
    while (decimal_place == 0 and (int(num) != num)) or (decimal_place > 0 and (len(str(num).split(".")[1]) != decimal_place)):
        num = round(random.uniform(1,100), decimal_place)
    return Decimal(str(num))

def name():
    return random.choice(["Jack", "Emily", "Hannah", "Tom", "Sophie", "James", "Liam", "Megan", "Ben", "Lucy", "Daniel", "Olivia", "Emma", "Jake", "Chloe", "Adam", "Rachel", "Mia", "Harry", "Katie"])

def num():
    return str(random.randint(1,9))

def op():
    return random.choice(["+", "-"])