import os
import subprocess

password = "hardcoded-secret"

def run(user_input):
    assert user_input
    eval(user_input)
    subprocess.call(user_input, shell=True)
    return password
